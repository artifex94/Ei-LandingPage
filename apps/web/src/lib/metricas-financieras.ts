/**
 * Panel de liquidez/aging del tesorero — funciones PURAS (sin React ni Prisma).
 *
 * Cero data nueva: todo se calcula sobre `Pago` existente. La regla de
 * vencimiento (aging) replica exactamente la de `calcDPD` en `billing-state.ts`
 * (último día del mes del período, ver comentario ahí) pero recibe `ahora`
 * como parámetro en vez de leer `new Date()` internamente — así queda pura y
 * testeable de forma determinística. No se reinventa el criterio, solo se
 * parametriza el reloj.
 */

const ESTADOS_IMPAGOS = new Set(["PENDIENTE", "VENCIDO", "PROCESANDO"]);

export interface PagoParaLiquidez {
  estado: string;
  importe: number;
  mes: number;
  anio: number;
  acreditado_en: Date | string | null;
}

export interface Liquidez {
  cobradoSemana: number;
  cobradoMes: number;
  pendienteMes: number;
  /** cobradoMes + pendienteMes × tasa de cobranza del trimestre calendario previo. */
  proyeccionMes: number;
}

export interface PagoParaTasa {
  estado: string;
  importe: number;
}

export interface MesTasaCobranza {
  mes: number;
  anio: number;
  pagos: PagoParaTasa[];
}

export interface TasaCobranzaMes {
  mes: number;
  anio: number;
  generado: number;
  pagado: number;
  /** 0-100. 0 si ese mes no generó pagos (evita división por cero, no NaN). */
  tasaPct: number;
}

export interface PagoImpagoParaAging {
  mes: number;
  anio: number;
  importe: number;
}

export interface BucketAging {
  monto: number;
  cantidad: number;
}

export interface Aging {
  hasta30: BucketAging;
  de31a60: BucketAging;
  de61a90: BucketAging;
  mas90: BucketAging;
}

/** (mes, anio) 1-indexado de los `cantidad` meses calendario anteriores a (mes, anio), orden desc (el más reciente primero). */
function mesesPrevios(
  mes: number,
  anio: number,
  cantidad: number
): { mes: number; anio: number }[] {
  const out: { mes: number; anio: number }[] = [];
  let m = mes;
  let y = anio;
  for (let i = 0; i < cantidad; i++) {
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    out.push({ mes: m, anio: y });
  }
  return out;
}

/**
 * % pagado sobre generado por mes (últimos N meses que el caller decida pasar).
 * `pagosPorMes` ya viene agrupado por el caller (server component) — esta función
 * no conoce "hoy", solo agrega. Un mes sin pagos generados da tasaPct = 0, nunca NaN.
 */
export function calcularTasaCobranza(
  pagosPorMes: MesTasaCobranza[]
): TasaCobranzaMes[] {
  return pagosPorMes.map(({ mes, anio, pagos }) => {
    const generado = pagos.reduce((s, p) => s + p.importe, 0);
    const pagado = pagos
      .filter((p) => p.estado === "PAGADO")
      .reduce((s, p) => s + p.importe, 0);
    const tasaPct = generado > 0 ? Math.round((pagado / generado) * 1000) / 10 : 0;
    return { mes, anio, generado, pagado, tasaPct };
  });
}

/**
 * Liquidez del tesorero: cuánto entró, cuánto falta y una proyección conservadora.
 *
 * - `cobradoSemana`/`cobradoMes` miran `acreditado_en` (cuándo entró la plata),
 *   no el período (`mes`/`anio`) que el pago salda.
 * - `pendienteMes` es lo que falta cobrar del período corriente (PENDIENTE/
 *   VENCIDO/PROCESANDO con `mes`/`anio` = mes actual).
 * - `proyeccionMes` = cobradoMes + pendienteMes × tasa de cobranza del
 *   trimestre calendario previo. Si el trimestre previo no generó pagos,
 *   la tasa es 0 (conservador: no se proyecta cobranza sin historial).
 *
 * Bucketing por componentes UTC (no locales): `acreditado_en` mezcla dos
 * fuentes — timestamps reales (webhooks MP/Talo, hora AR real) y columnas
 * `@db.Date` guardadas a medianoche UTC (transferencias conciliadas, ver
 * `parsearFecha`/`construirFechaUTC` en `conciliacion-bancaria.ts`). Usar
 * `getMonth`/`getFullYear` (locales) hacía que el resultado dependiera de la
 * TZ del PROCESO que corre esta función — no determinístico entre dev/CI/
 * prod. Los componentes UTC son estables sin importar `process.env.TZ`:
 * coinciden exactamente con el día calendario para los `@db.Date`, y
 * desvían como mucho 3h para los timestamps AR reales (offset AR = UTC-3;
 * el server de prod corre en UTC de todos modos).
 */
export function calcularLiquidez(
  pagos: PagoParaLiquidez[],
  ahora: Date = new Date()
): Liquidez {
  const anioAhora = ahora.getUTCFullYear();
  const mesAhora0 = ahora.getUTCMonth(); // 0-indexado, para Date.UTC
  const diaAhora = ahora.getUTCDate();

  const finHoyMs = Date.UTC(anioAhora, mesAhora0, diaAhora, 23, 59, 59, 999);
  const inicioSemanaMs = Date.UTC(anioAhora, mesAhora0, diaAhora - 7, 0, 0, 0, 0);

  const mesActual = mesAhora0 + 1;
  const anioActual = anioAhora;

  const pagados = pagos.filter((p) => p.estado === "PAGADO" && p.acreditado_en);

  const cobradoSemana = pagados
    .filter((p) => {
      const fMs = new Date(p.acreditado_en as Date | string).getTime();
      return fMs >= inicioSemanaMs && fMs <= finHoyMs;
    })
    .reduce((s, p) => s + p.importe, 0);

  const cobradoMes = pagados
    .filter((p) => {
      const f = new Date(p.acreditado_en as Date | string);
      return f.getUTCMonth() + 1 === mesActual && f.getUTCFullYear() === anioActual;
    })
    .reduce((s, p) => s + p.importe, 0);

  const pendienteMes = pagos
    .filter(
      (p) => ESTADOS_IMPAGOS.has(p.estado) && p.mes === mesActual && p.anio === anioActual
    )
    .reduce((s, p) => s + p.importe, 0);

  const trimestrePrevio = mesesPrevios(mesActual, anioActual, 3);
  const pagosTrimestre = pagos.filter((p) =>
    trimestrePrevio.some((t) => t.mes === p.mes && t.anio === p.anio)
  );
  const [{ tasaPct }] = calcularTasaCobranza([
    { mes: 0, anio: 0, pagos: pagosTrimestre },
  ]);
  const tasaTrimestre = tasaPct / 100;

  const proyeccionMes = cobradoMes + pendienteMes * tasaTrimestre;

  return { cobradoSemana, cobradoMes, pendienteMes, proyeccionMes };
}

/** Misma regla de vencimiento que `calcDPD` (billing-state.ts): último día del mes del período. */
function diasVencido(mes: number, anio: number, ahora: Date): number {
  const vencimiento = new Date(anio, mes, 0);
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  const diffMs = hoy.getTime() - vencimiento.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

/**
 * Aging de la deuda impaga en buckets de 30/60/90 días, según días vencidos
 * desde el último día del mes del período (mismo criterio que `calcDPD`).
 * Bordes inclusivos hacia abajo: 30 → hasta30, 31 → de31a60, etc.
 */
export function calcularAging(
  pagosImpagos: PagoImpagoParaAging[],
  ahora: Date = new Date()
): Aging {
  const aging: Aging = {
    hasta30: { monto: 0, cantidad: 0 },
    de31a60: { monto: 0, cantidad: 0 },
    de61a90: { monto: 0, cantidad: 0 },
    mas90: { monto: 0, cantidad: 0 },
  };

  for (const p of pagosImpagos) {
    const dias = diasVencido(p.mes, p.anio, ahora);
    const bucket =
      dias <= 30
        ? aging.hasta30
        : dias <= 60
          ? aging.de31a60
          : dias <= 90
            ? aging.de61a90
            : aging.mas90;
    bucket.monto += p.importe;
    bucket.cantidad += 1;
  }

  return aging;
}

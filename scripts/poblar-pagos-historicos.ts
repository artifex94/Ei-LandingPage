/**
 * Marca como PAGADO todos los meses desde la fecha de alta de cada cuenta
 * hasta el mes actual (inclusive).
 *
 * Lógica de importe por mes:
 *   - Si la cuenta tiene costo_mensual propio → usa ese valor siempre.
 *   - Si no → busca en TarifaHistorico la tarifa estándar vigente ese mes
 *     (mayor vigente_desde que sea ≤ al primer día del mes). Si no hay ninguna
 *     tarifa histórica para ese mes usa la más antigua disponible.
 *
 * Idempotente: PENDIENTE/VENCIDO → actualiza a PAGADO.
 *              PROCESANDO        → omite (pago en tránsito, no tocar).
 *              PAGADO            → actualiza timestamps de acreditación.
 *
 * Ejecutar:
 *   cd frontend/Ei-LandingPage
 *   npx dotenv -e .env.local -- npx tsx scripts/poblar-pagos-historicos.ts
 *
 * Dry-run (sin escribir):
 *   DRY_RUN=1 npx dotenv -e .env.local -- npx tsx scripts/poblar-pagos-historicos.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DRY_RUN = process.env.DRY_RUN === "1";
const METODO = "EFECTIVO" as const;
const REGISTRADO_POR = "Carga inicial histórica";

// ── Helpers ──────────────────────────────────────────────────────────────────

function primerDiaDeMes(anio: number, mes: number): Date {
  return new Date(anio, mes - 1, 1);
}

/** Retorna { anio, mes } de todos los meses entre fechaDesde y fechaHasta (inclusive). */
function generarMeses(
  desde: Date,
  hasta: Date,
): { anio: number; mes: number }[] {
  const resultado: { anio: number; mes: number }[] = [];
  let anio = desde.getFullYear();
  let mes = desde.getMonth() + 1;
  const anioHasta = hasta.getFullYear();
  const mesHasta = hasta.getMonth() + 1;

  while (anio < anioHasta || (anio === anioHasta && mes <= mesHasta)) {
    resultado.push({ anio, mes });
    mes++;
    if (mes > 12) { mes = 1; anio++; }
  }
  return resultado;
}

/** Encuentra la tarifa estándar vigente para el primer día del mes dado.
 *  tarifas debe venir ordenado por vigente_desde ASC. */
function tarifaParaMes(
  tarifas: { monto: { toNumber(): number }; vigente_desde: Date }[],
  primerDia: Date,
): number {
  // La tarifa aplicable es la más reciente cuya vigente_desde <= primerDia
  let aplicable = tarifas[0]; // la más antigua como fallback
  for (const t of tarifas) {
    if (t.vigente_desde <= primerDia) aplicable = t;
  }
  return aplicable?.monto.toNumber() ?? 15000;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  if (DRY_RUN) console.log("⚠  DRY RUN — no se escribirá nada en la base de datos\n");

  // Carga historial de tarifas (ASC para poder hacer búsqueda secuencial)
  const tarifas = await prisma.tarifaHistorico.findMany({
    orderBy: { vigente_desde: "asc" },
    select: { monto: true, vigente_desde: true },
  });
  console.log(`📋 ${tarifas.length} tarifa(s) históricas cargadas`);
  if (tarifas.length === 0) {
    console.warn("   ⚠ Sin tarifas históricas — se usará $15.000 como fallback");
  }

  const hoy = new Date();

  // Todas las cuentas (incluyendo las dadas de baja para completar historial)
  const cuentas = await prisma.cuenta.findMany({
    select: {
      id: true,
      descripcion: true,
      softguard_ref: true,
      created_at: true,
      costo_mensual: true,
      perfil: { select: { nombre: true, fecha_alta_softguard: true } },
    },
    orderBy: { descripcion: "asc" },
  });
  console.log(`🏠 ${cuentas.length} cuentas encontradas\n`);

  let totalCreados = 0;
  let totalActualizados = 0;
  let totalOmitidos = 0;
  let totalErrores = 0;

  for (const cuenta of cuentas) {
    const fechaAlta = cuenta.perfil.fecha_alta_softguard ?? cuenta.created_at;
    const meses = generarMeses(fechaAlta, hoy);

    let creadosCuenta = 0;
    let actualizadosCuenta = 0;
    let omitidosCuenta = 0;

    for (const { anio, mes } of meses) {
      const primerDia = primerDiaDeMes(anio, mes);
      const importe = cuenta.costo_mensual
        ? Number(cuenta.costo_mensual)
        : tarifaParaMes(tarifas, primerDia);

      if (DRY_RUN) {
        creadosCuenta++;
        continue;
      }

      try {
        // Verificar si ya existe un pago en PROCESANDO (no tocar)
        const existente = await prisma.pago.findUnique({
          where: { cuenta_id_mes_anio: { cuenta_id: cuenta.id, mes, anio } },
          select: { estado: true },
        });

        if (existente?.estado === "PROCESANDO") {
          omitidosCuenta++;
          continue;
        }

        const result = await prisma.pago.upsert({
          where: { cuenta_id_mes_anio: { cuenta_id: cuenta.id, mes, anio } },
          create: {
            cuenta_id: cuenta.id,
            mes,
            anio,
            importe,
            estado: "PAGADO",
            metodo: METODO,
            acreditado_en: primerDia,
            registrado_por: REGISTRADO_POR,
          },
          update: {
            estado: "PAGADO",
            importe,
            metodo: METODO,
            acreditado_en: primerDia,
            registrado_por: REGISTRADO_POR,
          },
        });

        const isNew = result.created_at.getTime() === result.updated_at.getTime();
        if (isNew) creadosCuenta++; else actualizadosCuenta++;
      } catch (err) {
        console.error(`  ✗ [${cuenta.softguard_ref ?? cuenta.id}] ${anio}-${mes}: ${(err as Error).message.split("\n")[0]}`);
        totalErrores++;
      }
    }

    const nombreCorto = cuenta.descripcion.slice(0, 45).padEnd(45);
    const ref = (cuenta.softguard_ref ?? "—").padStart(5);
    const fechaStr = fechaAlta.toISOString().slice(0, 7);
    console.log(
      `  ${ref}  ${nombreCorto}  desde ${fechaStr}  +${meses.length} meses` +
      (DRY_RUN
        ? ""
        : `  [new:${creadosCuenta} upd:${actualizadosCuenta} skip:${omitidosCuenta}]`)
    );

    totalCreados += creadosCuenta;
    totalActualizados += actualizadosCuenta;
    totalOmitidos += omitidosCuenta;
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`📊 Resumen final:`);
  if (DRY_RUN) {
    console.log(`   Pagos que se crearían: ${totalCreados} (dry-run)`);
  } else {
    console.log(`   Pagos creados:          ${totalCreados}`);
    console.log(`   Pagos actualizados:     ${totalActualizados}`);
    console.log(`   Omitidos (PROCESANDO):  ${totalOmitidos}`);
    console.log(`   Errores:                ${totalErrores}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

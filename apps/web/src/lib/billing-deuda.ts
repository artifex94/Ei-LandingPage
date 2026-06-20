/**
 * Agregación de deuda de un cliente/cuentas — función PURA (sin React ni Prisma).
 *
 * Centraliza el cálculo de {deuda total, meses adeudados, próximo vencimiento, días de
 * mora} que hoy está duplicado inline en el cron (`lib/cron/cierre-mensual.ts`) y en
 * `app/admin/morosidad/page.tsx`. Reutiliza la regla de vencimiento de `calcDPD`
 * (último día del mes del impago más antiguo) para no divergir.
 */

import { calcDPD } from "./billing-state";

const ESTADOS_IMPAGOS = new Set(["PENDIENTE", "VENCIDO"]);

export interface PagoParaDeuda {
  mes: number;
  anio: number;
  importe: number;
  estado: string;
}

export interface MesAdeudado {
  mes: number;
  anio: number;
  importe: number;
}

export interface ResumenDeuda {
  deudaTotal: number;
  mesesAdeudados: MesAdeudado[]; // ordenados del más antiguo al más reciente
  proximoVtoISO: string | null;  // último día del mes del impago más antiguo (o null si no debe)
  diasMora: number;              // 0 si está al día
}

/**
 * Resume la deuda a partir de los pagos de una o varias cuentas (los PENDIENTE/VENCIDO).
 */
export function resumenDeudaCuentas(pagos: PagoParaDeuda[]): ResumenDeuda {
  const impagos = pagos.filter((p) => ESTADOS_IMPAGOS.has(p.estado));

  const deudaTotal = impagos.reduce((sum, p) => sum + p.importe, 0);

  const mesesAdeudados = impagos
    .map((p) => ({ mes: p.mes, anio: p.anio, importe: p.importe }))
    .sort((a, b) => a.anio - b.anio || a.mes - b.mes);

  const masAntiguo = mesesAdeudados[0] ?? null;
  // Date.UTC(anio, mes, 0): último día del mes (mes 1-indexed) en UTC — explícito para que
  // el ISO no dependa de la TZ del server (en local podría desfasar un día).
  const proximoVtoISO = masAntiguo
    ? new Date(Date.UTC(masAntiguo.anio, masAntiguo.mes, 0)).toISOString()
    : null;

  return {
    deudaTotal,
    mesesAdeudados,
    proximoVtoISO,
    diasMora: calcDPD(impagos),
  };
}

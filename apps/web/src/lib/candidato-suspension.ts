/**
 * Decisión pura de la cola "A suspender hoy" — Fase 3 del plan maestro (tesoreros).
 *
 * Sin efectos, sin Prisma: el cron (`ejecutarCierreMensual`) es quien lee/escribe
 * `CandidatoSuspension` y solo delega acá la decisión de qué hacer dado el estado
 * actual de la cuenta y si ya existe un candidato ABIERTO.
 */

/** Candidato ABIERTO existente para la cuenta (resuelto_en = null), si lo hay. */
export interface CandidatoSuspensionAbierto {
  id: string;
  dpd: number;
  deuda_total: number;
}

export type DecisionCandidatoSuspension =
  | { tipo: "CREAR"; dpd: number; deuda_total: number }
  | { tipo: "ACTUALIZAR"; id: string; dpd: number; deuda_total: number }
  | { tipo: "CERRAR_PAGO_RECIBIDO"; id: string }
  | { tipo: "SIN_CAMBIOS" };

/**
 * Decide qué hacer con la cola de suspensión para una cuenta dada:
 *   - Sin candidato abierto y califica (DPD >= umbral y hay deuda) → CREAR.
 *   - Con candidato abierto y sigue calificando → ACTUALIZAR si dpd/deuda cambiaron,
 *     SIN_CAMBIOS si no (idempotente: el cron puede correr N veces sin duplicar filas).
 *   - Con candidato abierto pero la deuda se saldó (deudaTotal <= 0) → cerrar como
 *     PAGO_RECIBIDO (el cliente pagó antes de que el tesorero decidiera).
 *   - Sin candidato abierto y no califica → SIN_CAMBIOS.
 *
 * Nota: si el DPD cae por debajo del umbral pero todavía queda deuda (pago parcial
 * de una cuota distinta a la más antigua), el candidato queda abierto sin cambios —
 * el spec solo define el cierre automático para "sin deuda". Cerrarlo antes sería
 * una decisión de negocio no pedida; el tesorero puede condonarlo manualmente.
 */
export function decidirCandidatoSuspension(
  dpd: number,
  deudaTotal: number,
  diasSuspension: number,
  candidatoAbierto: CandidatoSuspensionAbierto | null,
): DecisionCandidatoSuspension {
  const califica = dpd >= diasSuspension && deudaTotal > 0;

  if (califica) {
    if (!candidatoAbierto) {
      return { tipo: "CREAR", dpd, deuda_total: deudaTotal };
    }
    if (candidatoAbierto.dpd !== dpd || candidatoAbierto.deuda_total !== deudaTotal) {
      return { tipo: "ACTUALIZAR", id: candidatoAbierto.id, dpd, deuda_total: deudaTotal };
    }
    return { tipo: "SIN_CAMBIOS" };
  }

  if (candidatoAbierto && deudaTotal <= 0) {
    return { tipo: "CERRAR_PAGO_RECIBIDO", id: candidatoAbierto.id };
  }

  return { tipo: "SIN_CAMBIOS" };
}

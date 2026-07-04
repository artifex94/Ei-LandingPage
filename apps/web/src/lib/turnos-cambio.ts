/**
 * Reglas puras del flujo de solicitud de cambio de turno (sin IO).
 * Las server actions de `lib/actions/turnos.ts` las aplican contra la DB;
 * acá viven separadas para poder testearlas con vitest.
 */

export const MOTIVO_MIN = 5;
export const MOTIVO_MAX = 500;

export interface TurnoParaCambio {
  fecha: Date;
  estado: string;
}

export type ResultadoElegibilidad = { ok: true } | { ok: false; motivo: string };

/**
 * Un turno admite solicitud de cambio solo si todavía no arrancó (fecha de hoy
 * en adelante — mismo criterio de ventana que /portal/mis-turnos) y sigue
 * PROGRAMADO (no en curso, completado, ausente ni ya reemplazado).
 */
export function puedeSolicitarCambio(
  turno: TurnoParaCambio,
  ahora: Date = new Date(),
): ResultadoElegibilidad {
  if (turno.estado !== "PROGRAMADO") {
    return { ok: false, motivo: "Solo se puede pedir cambio de un turno programado." };
  }

  const inicioHoy = new Date(ahora);
  inicioHoy.setHours(0, 0, 0, 0);
  if (turno.fecha < inicioHoy) {
    return { ok: false, motivo: "El turno ya pasó." };
  }

  return { ok: true };
}

/** Motivo obligatorio, con piso para evitar "x" y techo para no desbordar la bandeja. */
export function validarMotivoCambio(motivo: string): ResultadoElegibilidad {
  const limpio = motivo.trim();
  if (limpio.length < MOTIVO_MIN) {
    return { ok: false, motivo: `Contanos el motivo (mínimo ${MOTIVO_MIN} caracteres).` };
  }
  if (limpio.length > MOTIVO_MAX) {
    return { ok: false, motivo: `El motivo es demasiado largo (máximo ${MOTIVO_MAX} caracteres).` };
  }
  return { ok: true };
}

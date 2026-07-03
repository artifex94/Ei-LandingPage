/**
 * Lógica PURA del chip "Suele disparar a esta hora" del drawer de monitoreo
 * (Fase 10 del plan maestro). Sin Prisma ni `server-only`: el endpoint
 * (`/api/admin/patron-evento`) arma el histograma por hora desde la DB y le
 * pasa acá el cálculo, así queda testeable con vitest sin mockear nada.
 */

export interface PatronHorario {
  /** Hora del día (0–23) con más eventos históricos cerca de la hora actual. */
  hora: number;
  /** Cantidad de eventos históricos disparados en esa hora puntual. */
  veces: number;
}

/** A partir de cuántos eventos en la ventana ±1h se considera "patrón" (no ruido). */
const UMBRAL_PATRON = 3;

/**
 * Dado un histograma de 24 posiciones (cantidad de eventos históricos por hora
 * del día, en horario de Argentina) y la hora del evento actual, decide si hay
 * un patrón horario: si la suma de eventos en `horaActual` ± 1h llega al
 * umbral, devuelve la hora pico de esa ventana de 3h y su propio conteo; si no,
 * `null` (no hay suficiente señal para mostrar el chip).
 */
export function calcularPatronHorario(counts: number[], horaActual: number): PatronHorario | null {
  if (counts.length !== 24 || horaActual < 0 || horaActual > 23) return null;

  const candidatas = [(horaActual + 23) % 24, horaActual, (horaActual + 1) % 24];
  const total = candidatas.reduce((acc, h) => acc + (counts[h] ?? 0), 0);
  if (total < UMBRAL_PATRON) return null;

  const pico = candidatas.reduce(
    (mejor, h) => ((counts[h] ?? 0) > (counts[mejor] ?? 0) ? h : mejor),
    candidatas[0],
  );
  return { hora: pico, veces: counts[pico] ?? 0 };
}

/** Arma el histograma de 24 posiciones a partir de las horas (0–23) de cada evento histórico. */
export function histogramaPorHora(horas: number[]): number[] {
  const counts = new Array<number>(24).fill(0);
  for (const h of horas) {
    if (h >= 0 && h <= 23) counts[h] += 1;
  }
  return counts;
}

/**
 * Salud de un cron — decisión pura para el panel "Salud de crons"
 * (/admin/sync-softguard, Fase 5 del plan maestro). Sin Prisma: el caller le
 * pasa la última corrida conocida (o null si no hay ninguna / la tabla
 * todavía no existe) y decide el estado visual.
 */

export type EstadoSaludCron = "ok" | "atrasado" | "error" | "sin_datos";

export interface UltimaCorridaCron {
  estado: "OK" | "ERROR";
  started_at: Date;
  /**
   * `null` mientras la corrida está en curso. `conRegistroCronRun` crea la
   * fila con estado="OK" y `finished_at` recién se completa al terminar — si
   * el proceso muere a mitad de camino, la fila queda "OK" con
   * `finished_at: null` PARA SIEMPRE. Sin este campo, `estadoSaludCron` no
   * puede distinguir "en curso" (normal) de "colgada" (síntoma real).
   */
  finished_at: Date | null;
}

// Umbral propio para detectar una corrida colgada (no reutiliza `umbralMs`,
// que mide atraso ENTRE corridas). 15 min o 1/4 del umbral de atraso del
// cron, lo que sea mayor — una corrida normal rara vez tarda más que eso.
const UMBRAL_COLGADO_MIN_MS = 15 * 60 * 1000;

/**
 * Decide el estado de salud de un cron dado:
 *   - Sin corridas registradas → "sin_datos".
 *   - Última corrida sin `finished_at` (en curso) y `started_at` hace más del
 *     umbral de colgado → "error" (corrida incompleta: el proceso murió).
 *   - Última corrida sin `finished_at` pero reciente → "ok" (en curso, normal).
 *   - Última corrida en ERROR → "error" (prioridad sobre el umbral de tiempo:
 *     un cron que corrió hace 1 minuto pero falló no es "ok").
 *   - Última corrida OK pero más vieja que `umbralMs` → "atrasado" (síntoma
 *     de que el cron dejó de correr, ej. sync SoftGuard muerto).
 *   - Última corrida OK y dentro del umbral → "ok".
 *
 * Borde exacto: `ahora - started_at === umbral` cuenta como "ok" (todavía
 * no superó el umbral; recién lo supera al pasarlo).
 */
export function estadoSaludCron(
  ultimaCorrida: UltimaCorridaCron | null,
  umbralMs: number,
  ahora: Date,
): EstadoSaludCron {
  if (!ultimaCorrida) return "sin_datos";

  const antiguedadMs = ahora.getTime() - ultimaCorrida.started_at.getTime();

  if (ultimaCorrida.finished_at === null) {
    const umbralColgadoMs = Math.max(UMBRAL_COLGADO_MIN_MS, umbralMs / 4);
    return antiguedadMs > umbralColgadoMs ? "error" : "ok";
  }

  if (ultimaCorrida.estado === "ERROR") return "error";

  return antiguedadMs > umbralMs ? "atrasado" : "ok";
}

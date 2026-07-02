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
}

/**
 * Decide el estado de salud de un cron dado:
 *   - Sin corridas registradas → "sin_datos".
 *   - Última corrida en ERROR → "error" (prioridad sobre el umbral de tiempo:
 *     un cron que corrió hace 1 minuto pero falló no es "ok").
 *   - Última corrida OK pero más vieja que `umbralMs` → "atrasado" (síntoma
 *     de que el cron dejó de correr, ej. sync SoftGuard muerto).
 *   - Última corrida OK y dentro del umbral → "ok".
 *
 * Borde exacto: `ahora - started_at === umbralMs` cuenta como "ok" (todavía
 * no superó el umbral; recién lo supera al pasarlo).
 */
export function estadoSaludCron(
  ultimaCorrida: UltimaCorridaCron | null,
  umbralMs: number,
  ahora: Date,
): EstadoSaludCron {
  if (!ultimaCorrida) return "sin_datos";
  if (ultimaCorrida.estado === "ERROR") return "error";

  const antiguedadMs = ahora.getTime() - ultimaCorrida.started_at.getTime();
  return antiguedadMs > umbralMs ? "atrasado" : "ok";
}

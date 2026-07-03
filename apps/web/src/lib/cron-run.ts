import "server-only";

import { prisma } from "@/lib/prisma/client";

/**
 * Wrapper de observabilidad para los crons (cierre mensual, sync SoftGuard,
 * auto-turnos) — Fase 5 del plan maestro (administradores). Antes un cron
 * caído (ej. sync SoftGuard muerto) era invisible hasta que reclamaba un
 * cliente; ahora cada corrida queda registrada en `CronRun` con estado,
 * duración y un resumen, visible en /admin/sync-softguard.
 *
 * Contrato:
 *   - Ejecuta `fn` SIEMPRE (nunca cambia su resultado ni su forma de fallar:
 *     si `fn` tira, el wrapper registra el error y RE-LANZA la misma
 *     excepción, así el handler HTTP que lo llama se comporta exactamente
 *     igual que antes de existir este wrapper).
 *   - Las escrituras de registro (crear/actualizar la fila `CronRun`) son
 *     best-effort: van en su propio try/catch, nunca envuelven a `fn`. Si la
 *     tabla no existe todavía (sync manual pendiente) o la DB está caída, el
 *     cron corre igual — logueamos y seguimos.
 *   - `resumen` se guarda como el JSON.stringify del resultado de `fn` (si es
 *     serializable) para poder truncarlo/mostrarlo en la tabla del panel.
 */
export async function conRegistroCronRun<T>(
  nombre: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = new Date();
  let runId: string | null = null;

  try {
    const run = await prisma.cronRun.create({
      data: { cron: nombre, estado: "OK", started_at: startedAt },
      select: { id: true },
    });
    runId = run.id;
  } catch (err) {
    console.warn(`[cron-run] no se pudo registrar inicio de "${nombre}":`, err);
  }

  const t0 = Date.now();

  try {
    const resultado = await fn();

    try {
      if (runId) {
        await prisma.cronRun.update({
          where: { id: runId },
          data: {
            estado: "OK",
            finished_at: new Date(),
            duracion_ms: Date.now() - t0,
            resumen: resumirResultado(resultado),
          },
        });
      }
    } catch (err) {
      console.warn(`[cron-run] no se pudo registrar fin OK de "${nombre}":`, err);
    }

    return resultado;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);

    try {
      if (runId) {
        await prisma.cronRun.update({
          where: { id: runId },
          data: {
            estado: "ERROR",
            finished_at: new Date(),
            duracion_ms: Date.now() - t0,
            resumen: mensaje,
          },
        });
      }
    } catch (registroErr) {
      console.warn(`[cron-run] no se pudo registrar fin ERROR de "${nombre}":`, registroErr);
    }

    throw err;
  }
}

function resumirResultado(resultado: unknown): string | null {
  try {
    return JSON.stringify(resultado) ?? null;
  } catch {
    return null;
  }
}

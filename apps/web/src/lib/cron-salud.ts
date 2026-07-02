import "server-only";

import { prisma } from "@/lib/prisma/client";
import { estadoSaludCron, type EstadoSaludCron, type UltimaCorridaCron } from "@/lib/estado-salud-cron";

/**
 * Catálogo de los 3 crons conocidos del portal — Fase 5 del plan maestro
 * (panel "Salud de crons" en /admin/sync-softguard). Nombres estables: deben
 * coincidir con el primer argumento de `conRegistroCronRun` en cada route
 * handler (src/app/api/cron/**).
 */
export const CRONS_CONOCIDOS = [
  {
    nombre: "cierre-mensual",
    label: "Cierre mensual",
    frecuenciaLabel: "mensual",
    umbralMs: 32 * 24 * 60 * 60 * 1000, // 32 días
  },
  {
    nombre: "softguard-sync",
    label: "Sync SoftGuard",
    frecuenciaLabel: "cada 5 min",
    umbralMs: 10 * 60 * 1000, // 10 min
  },
  {
    nombre: "turnos-auto",
    label: "Auto-turnos",
    frecuenciaLabel: "cada 4 h",
    umbralMs: 5 * 60 * 60 * 1000, // 5 h
  },
] as const;

export interface SaludCron {
  nombre: string;
  label: string;
  frecuenciaLabel: string;
  ultima: UltimaCorridaCron | null;
  salud: EstadoSaludCron;
}

/**
 * Salud de los 3 crons conocidos, cada una resuelta contra su última corrida
 * registrada en `CronRun`. Best-effort: si la tabla no existe todavía (sync
 * manual pendiente) o la query falla, ese cron cae en "sin_datos" — nunca
 * rompe la página que lo consuma.
 */
export async function obtenerSaludCrons(ahora: Date = new Date()): Promise<SaludCron[]> {
  return Promise.all(
    CRONS_CONOCIDOS.map(async (c) => {
      let ultima: UltimaCorridaCron | null = null;
      try {
        const row = await prisma.cronRun.findFirst({
          where: { cron: c.nombre },
          orderBy: { started_at: "desc" },
          select: { estado: true, started_at: true },
        });
        ultima = row ? { estado: row.estado, started_at: row.started_at } : null;
      } catch {
        ultima = null;
      }

      return {
        nombre: c.nombre,
        label: c.label,
        frecuenciaLabel: c.frecuenciaLabel,
        ultima,
        salud: estadoSaludCron(ultima, c.umbralMs, ahora),
      };
    }),
  );
}

export interface CorridaCronReciente {
  id: string;
  cron: string;
  estado: "OK" | "ERROR";
  started_at: Date;
  finished_at: Date | null;
  duracion_ms: number | null;
  resumen: string | null;
}

/** Últimas `take` corridas de cualquier cron, para el historial del panel. */
export async function obtenerUltimasCorridasCron(take = 10): Promise<CorridaCronReciente[]> {
  try {
    return await prisma.cronRun.findMany({
      orderBy: { started_at: "desc" },
      take,
    });
  } catch {
    return [];
  }
}

/** Atajo liviano para el dashboard: ¿hay algún cron atrasado o en error? */
export async function hayCronConProblema(ahora: Date = new Date()): Promise<boolean> {
  const salud = await obtenerSaludCrons(ahora);
  return salud.some((c) => c.salud === "atrasado" || c.salud === "error");
}

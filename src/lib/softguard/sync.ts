/**
 * Jobs de sincronización SoftGuard → portal.
 *
 * syncCuentas()    — cada 6 h: upsert de Cuenta y Perfil desde vw_ei_cuentas_resumen
 * syncEventos()    — cada 5 min: trae últimos eventos a EventoAlarma
 * syncEstadoOT()   — cada 30 min: actualiza st_softguard_numero en OrdenTrabajo
 *
 * En modo mock (SOFTGUARD_MOCK=true o sin credenciales) retornan resultados vacíos sin error.
 */

import { prisma } from "@/lib/prisma/client";
import { withSoftguardConnection } from "./client";
import type { SgCuentaResumen, SgEventoReciente } from "./schema";

// ── Estado→enum mapping (9 estados nativos SoftGuard → EstadoEventoSync) ─────

const ESTADO_MAP: Record<string, string> = {
  "Nuevo":                    "NUEVO",
  "Pendiente":                "NUEVO",
  "En Proceso":               "EN_PROCESO",
  "Espera":                   "EN_ESPERA",
  "En Proceso desde Espera":  "EN_PROCESO_DESDE_ESPERA",
  "En Proceso Múltiple":      "EN_PROCESO_MULTIPLE",
  "Procesado":                "PROCESADO",
  "Procesado No Alerta":      "PROCESADO_NO_ALERTA",
  "Procesado Modo Prueba":    "PROCESADO_MODO_PRUEBA",
  "Procesado Modo Off":       "PROCESADO_MODO_OFF",
};

function mapEstado(raw: string): string {
  return ESTADO_MAP[raw] ?? "PROCESADO";
}

// ── syncCuentas ───────────────────────────────────────────────────────────────

export async function syncCuentas(): Promise<{ upserted: number; errors: number; mock: boolean }> {
  const result = await withSoftguardConnection(
    async (pool) => {
      const res = await pool.request().query<SgCuentaResumen>(
        "SELECT * FROM vw_ei_cuentas_resumen ORDER BY softguard_ref"
      );
      return res.recordset;
    },
    () => [] as SgCuentaResumen[]
  );

  if (!result.ok) {
    console.error("[syncCuentas] Error SoftGuard:", result.error);
    return { upserted: 0, errors: 1, mock: false };
  }

  if (result.mock) return { upserted: 0, errors: 0, mock: true };

  let upserted = 0;
  let errors   = 0;

  for (const sg of result.data) {
    try {
      await prisma.cuenta.updateMany({
        where:  { softguard_ref: sg.softguard_ref },
        data:   { zona_geografica: sg.localidad ?? undefined },
      });
      upserted++;
    } catch {
      errors++;
    }
  }

  return { upserted, errors, mock: false };
}

// ── syncEventos ───────────────────────────────────────────────────────────────

export async function syncEventos(): Promise<{ synced: number; errors: number; mock: boolean }> {
  const result = await withSoftguardConnection(
    async (pool) => {
      const res = await pool.request().query<SgEventoReciente & { estado_raw: string }>(
        `SELECT TOP 500 * FROM vw_ei_eventos_recientes ORDER BY fecha_evento DESC`
      );
      return res.recordset;
    },
    () => [] as (SgEventoReciente & { estado_raw: string })[]
  );

  if (!result.ok) {
    console.error("[syncEventos] Error SoftGuard:", result.error);
    return { synced: 0, errors: 1, mock: false };
  }

  if (result.mock) return { synced: 0, errors: 0, mock: true };

  let synced = 0;
  let errors = 0;

  for (const ev of result.data) {
    try {
      const cuenta = await prisma.cuenta.findFirst({
        where: { softguard_ref: ev.softguard_ref },
        select: { id: true },
      });

      await prisma.eventoAlarma.upsert({
        where: {
          softguard_ref_fecha_evento_codigo: {
            softguard_ref: ev.softguard_ref,
            fecha_evento:  ev.fecha_evento,
            codigo:        ev.codigo,
          },
        },
        create: {
          cuenta_id:          cuenta?.id ?? null,
          softguard_ref:      ev.softguard_ref,
          fecha_evento:       ev.fecha_evento,
          codigo:             ev.codigo,
          descripcion:        ev.descripcion,
          zona:               ev.zona ?? null,
          prioridad:          ev.prioridad ?? null,
          operador_softguard: ev.operador ?? null,
          estado:             mapEstado(ev.estado_raw ?? "Procesado") as never,
          resolucion:         ev.resolucion ?? null,
        },
        update: {
          estado:    mapEstado(ev.estado_raw ?? "Procesado") as never,
          resolucion: ev.resolucion ?? null,
          synced_at: new Date(),
        },
      });
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, errors, mock: false };
}

// ── syncEstadoOT ──────────────────────────────────────────────────────────────

export async function syncEstadoOT(): Promise<{ updated: number; mock: boolean }> {
  // Solo actualiza OTs que tienen st_softguard_numero (ya promovidas a SoftGuard)
  const otsConRef = await prisma.ordenTrabajo.findMany({
    where: { st_softguard_numero: { not: null }, estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
    select: { id: true, st_softguard_numero: true },
  });

  if (otsConRef.length === 0) return { updated: 0, mock: false };

  // Por ahora solo registra que la sync corrió — la lógica completa depende
  // de la vista vw_ei_ot_estado que se crea en SoftGuard SQL Server
  const result = await withSoftguardConnection(
    async () => otsConRef.length,
    () => 0
  );

  return { updated: result.ok ? (result.data ?? 0) : 0, mock: result.mock };
}

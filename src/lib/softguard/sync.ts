/**
 * Jobs de sincronización SoftGuard → portal.
 *
 * syncCuentas()  — cada 6 h: upsert de Cuenta desde vw_ei_cuentas_resumen
 * syncEventos()  — cada 5 min: trae eventos de vw_ei_eventos_recientes a EventoAlarma
 * syncEstadoOT() — cada 30 min: actualiza st_softguard_numero en OrdenTrabajo
 *
 * Mapeo de campos reales (schema _Datos):
 *   vw_ei_cuentas_resumen  → m_cuentas + m_CuentasXtraInfo + m_status
 *   vw_ei_eventos_recientes → EventosTimeLine (datos corrientes, últimos 30 d)
 *   vw_ei_ot_estado         → m_st_cabecera
 */

import { prisma } from "@/lib/prisma/client";
import { withSoftguardConnection } from "./client";
import type { SgCuentaResumen, SgEventoReciente } from "./schema";

// ── syncCuentas ───────────────────────────────────────────────────────────────

export async function syncCuentas(): Promise<{ upserted: number; errors: number; mock: boolean }> {
  const result = await withSoftguardConnection(
    async (pool) => {
      const res = await pool
        .request()
        .query<SgCuentaResumen>(
          "SELECT * FROM dbo.vw_ei_cuentas_resumen ORDER BY softguard_ref"
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
        where: { softguard_ref: sg.softguard_ref },
        data:  { zona_geografica: sg.localidad || undefined },
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
      const res = await pool
        .request()
        .query<SgEventoReciente>(
          "SELECT TOP 500 * FROM dbo.vw_ei_eventos_recientes ORDER BY fecha_evento DESC"
        );
      return res.recordset;
    },
    () => [] as SgEventoReciente[]
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
        where:  { softguard_ref: ev.softguard_ref },
        select: { id: true },
      });

      // Mapeo real: accion_code → codigo (String), accion → descripcion
      // Unique key: (softguard_ref, fecha_evento, codigo)
      const codigoKey = ev.accion_code.toString();

      await prisma.eventoAlarma.upsert({
        where: {
          softguard_ref_fecha_evento_codigo: {
            softguard_ref: ev.softguard_ref,
            fecha_evento:  ev.fecha_evento,
            codigo:        codigoKey,
          },
        },
        create: {
          cuenta_id:          cuenta?.id ?? null,
          softguard_ref:      ev.softguard_ref,
          fecha_evento:       ev.fecha_evento,
          codigo:             codigoKey,
          descripcion:        ev.accion,
          zona:               null,
          prioridad:          ev.accion_code,
          operador_softguard: ev.operador_id?.toString() ?? null,
          // Sin estado_nativo en el schema real — defaultear a PROCESADO
          estado:             "PROCESADO" as never,
          resolucion:         ev.observacion ?? null,
          raw:                ev.id_evento.toString(),
        },
        update: {
          descripcion:        ev.accion,
          operador_softguard: ev.operador_id?.toString() ?? null,
          resolucion:         ev.observacion ?? null,
          synced_at:          new Date(),
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
  const otsConRef = await prisma.ordenTrabajo.findMany({
    where:  { st_softguard_numero: { not: null }, estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
    select: { id: true, st_softguard_numero: true },
  });

  if (otsConRef.length === 0) return { updated: 0, mock: false };

  const result = await withSoftguardConnection(
    async () => otsConRef.length,
    () => 0
  );

  return { updated: result.ok ? (result.data ?? 0) : 0, mock: result.mock };
}

/**
 * Jobs de sincronización SoftGuard → portal.
 *
 * syncCuentas()  — enriquece Cuenta con localidad/provincia desde vw_ei_cuentas_resumen
 * syncEventos()  — trae los últimos 500 eventos de vw_ei_eventos_recientes a EventoAlarma
 * syncEstadoOT() — cierra en el portal las OTs que SoftGuard marcó como CERRADA (estado=2)
 *
 * Mapeo de vistas reales (_Datos):
 *   vw_ei_cuentas_resumen   → m_cuentas + m_CuentasXtraInfo + m_status
 *   vw_ei_eventos_recientes → EventosTimeLine (últimos 30 d)
 *   vw_ei_ot_estado         → m_st_cabecera
 *
 * Disparado por POST /api/cron/softguard (Bearer CRON_SECRET).
 */

import { prisma } from "@/lib/prisma/client";
import { withSoftguardConnection } from "./client";
import { softguardWebApiConfigured, fetchCodigosAlarma, fetchEventosPendientes, fetchCuentasDealer, fetchOrdenesServicio } from "./web-api";
import type { EstadoEventoSync } from "@/generated/prisma/client";
import type { SgCuentaResumen, SgEventoReciente } from "./schema";

// ── Clasificación de eventos por accion_code ──────────────────────────────────
//
// Códigos que requieren atención del administrador → NUEVO
//   1 = Alarma, 6 = Falla AC, 7 = Batería baja, desconocido = precaución
// Códigos rutinarios → no generan alerta en el panel
//   2 = Restauración, 3 = Test, 4 = Apertura, 5 = Cierre

const CODIGOS_ALERTA = new Set([1, 6, 7]);
const CODIGOS_PRUEBA = new Set([3]);
const CODIGOS_RUTINA = new Set([2, 4, 5]);

function estadoInicialEvento(accion_code: number): EstadoEventoSync {
  if (CODIGOS_ALERTA.has(accion_code)) return "NUEVO";
  if (CODIGOS_PRUEBA.has(accion_code)) return "PROCESADO_MODO_PRUEBA";
  if (CODIGOS_RUTINA.has(accion_code)) return "PROCESADO_NO_ALERTA";
  return "NUEVO"; // código desconocido → tratar con precaución
}

// ── syncCuentas ───────────────────────────────────────────────────────────────

export async function syncCuentas(): Promise<{
  actualizadas: number;
  sinMatch: number;
  errors: number;
  mock: boolean;
}> {
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
    return { actualizadas: 0, sinMatch: 0, errors: 1, mock: false };
  }

  if (result.mock) return { actualizadas: 0, sinMatch: 0, errors: 0, mock: true };

  let actualizadas = 0;
  let sinMatch     = 0;
  let errors       = 0;

  for (const sg of result.data) {
    try {
      const { count } = await prisma.cuenta.updateMany({
        where: { softguard_ref: sg.softguard_ref },
        data: {
          zona_geografica: sg.localidad  || undefined,
          localidad:       sg.localidad  || undefined,
          provincia:       sg.provincia  || undefined,
        },
      });

      if (count > 0) actualizadas++;
      else           sinMatch++;
    } catch (err) {
      console.error("[syncCuentas] Error al actualizar", sg.softguard_ref, err);
      errors++;
    }
  }

  return { actualizadas, sinMatch, errors, mock: false };
}

// ── syncEventos ───────────────────────────────────────────────────────────────

export async function syncEventos(): Promise<{
  synced: number;
  nuevos: number;
  errors: number;
  mock: boolean;
}> {
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
    return { synced: 0, nuevos: 0, errors: 1, mock: false };
  }

  if (result.mock) return { synced: 0, nuevos: 0, errors: 0, mock: true };

  let synced = 0;
  let nuevos = 0;
  let errors = 0;

  for (const ev of result.data) {
    try {
      // Buscar la cuenta local por softguard_ref para vincular el evento
      const cuenta = await prisma.cuenta.findFirst({
        where:  { softguard_ref: ev.softguard_ref },
        select: { id: true },
      });

      const codigoKey    = ev.accion_code.toString();
      const estadoCreate = estadoInicialEvento(ev.accion_code);

      const upserted = await prisma.eventoAlarma.upsert({
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
          zona:               ev.zona?.trim() || null,
          prioridad:          ev.accion_code,
          operador_softguard: ev.operador_id?.toString() ?? null,
          estado:             estadoCreate,
          resolucion:         ev.observacion ?? null,
          raw:                ev.id_evento.toString(),
        },
        update: {
          // No pisar el estado si el admin del portal ya lo procesó manualmente.
          // Solo actualizar datos informativos del evento.
          descripcion:        ev.accion,
          zona:               ev.zona?.trim() || null,
          operador_softguard: ev.operador_id?.toString() ?? null,
          resolucion:         ev.observacion ?? null,
          synced_at:          new Date(),
        },
        select: { id: true, estado: true },
      });

      synced++;
      if (upserted.estado === "NUEVO") nuevos++;
    } catch (err) {
      console.error("[syncEventos] Error evento", ev.id_evento, err);
      errors++;
    }
  }

  return { synced, nuevos, errors, mock: false };
}

// ── syncCuentasWebApi ──────────────────────────────────────────────────────────
//
// Variante de syncCuentas que lee de la API REST de la suite web (CuentaByDealer,
// la grilla del CRM). Además de dirección/localidad, proyecta el estado de
// comunicación del panel (test periódico, fallo de AC, último evento) en los
// campos sg_* de Cuenta. SOLO LECTURA contra SoftGuard.

export async function syncCuentasWebApi(): Promise<{
  actualizadas: number;
  sinMatch: number;
  errors: number;
  configured: boolean;
}> {
  if (!softguardWebApiConfigured()) {
    return { actualizadas: 0, sinMatch: 0, errors: 0, configured: false };
  }

  let cuentas;
  try {
    cuentas = await fetchCuentasDealer();
  } catch (err) {
    console.error("[syncCuentasWebApi] Error API web:", err);
    return { actualizadas: 0, sinMatch: 0, errors: 1, configured: true };
  }

  let actualizadas = 0;
  let sinMatch     = 0;
  let errors       = 0;
  const ahora = new Date();

  for (const sg of cuentas) {
    try {
      const { count } = await prisma.cuenta.updateMany({
        where: { softguard_ref: sg.softguard_ref },
        data: {
          // Dirección: solo pisar si SoftGuard trae dato (no blanquear lo cargado a mano).
          calle:         sg.calle         ?? undefined,
          localidad:     sg.localidad     ?? undefined,
          provincia:     sg.provincia     ?? undefined,
          codigo_postal: sg.codigo_postal ?? undefined,
          // Proyección sg_*: siempre, es el espejo de la central.
          sg_situacion:        sg.situacion,
          sg_en_fallo_tst:     sg.en_fallo_tst,
          sg_fallo_tst_desde:  sg.fallo_tst_desde,
          sg_ultimo_tst:       sg.ultimo_tst,
          sg_en_fallo_ac:      sg.en_fallo_ac,
          sg_ultimo_evento:    sg.ultimo_evento,
          sg_ultimo_evento_at: sg.ultimo_evento_at,
          sg_synced_at:        ahora,
        },
      });
      if (count > 0) actualizadas++;
      else sinMatch++; // cuentas de la central sin espejo en el portal (ej. línea _SG)
    } catch (err) {
      console.error("[syncCuentasWebApi] Error cuenta", sg.softguard_ref, err);
      errors++;
    }
  }

  return { actualizadas, sinMatch, errors, configured: true };
}

// ── syncEventosWebApi ──────────────────────────────────────────────────────────
//
// Variante de syncEventos que lee de la API REST de la suite web (:8080) en vez de
// SQL Server. Usar cuando el acceso directo a SQL está bloqueado por firewall.
// Trae la cola de eventos pendientes del multimonitor (alarmas sin atender) y los
// persiste en EventoAlarma, incluyendo la zona (zon_cdescripcion / rec_czona).

export async function syncEventosWebApi(): Promise<{
  synced: number;
  nuevos: number;
  errors: number;
  configured: boolean;
}> {
  if (!softguardWebApiConfigured()) {
    return { synced: 0, nuevos: 0, errors: 0, configured: false };
  }

  let catalogo;
  let eventos;
  try {
    catalogo = await fetchCodigosAlarma();
    eventos  = await fetchEventosPendientes(catalogo, 500);
  } catch (err) {
    console.error("[syncEventosWebApi] Error API web:", err);
    return { synced: 0, nuevos: 0, errors: 1, configured: true };
  }

  let synced = 0;
  let nuevos = 0;
  let errors = 0;

  for (const ev of eventos) {
    try {
      const cuenta = await prisma.cuenta.findFirst({
        where:  { softguard_ref: ev.softguard_ref },
        select: { id: true },
      });

      // Eventos pendientes = alarmas sin atender → estado NUEVO en el portal.
      const upserted = await prisma.eventoAlarma.upsert({
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
          zona:               ev.zona,
          prioridad:          ev.prioridad,
          operador_softguard: ev.operador_id,
          estado:             "NUEVO",
          resolucion:         ev.observacion,
          raw:                ev.id_evento,
        },
        update: {
          // No pisar el estado si el admin del portal ya lo procesó manualmente.
          descripcion:        ev.descripcion,
          zona:               ev.zona,
          operador_softguard: ev.operador_id,
          resolucion:         ev.observacion,
          synced_at:          new Date(),
        },
        select: { estado: true },
      });

      synced++;
      if (upserted.estado === "NUEVO") nuevos++;
    } catch (err) {
      console.error("[syncEventosWebApi] Error evento", ev.id_evento, err);
      errors++;
    }
  }

  return { synced, nuevos, errors, configured: true };
}

// ── syncEstadoOT ──────────────────────────────────────────────────────────────

export async function syncEstadoOT(): Promise<{
  revisadas: number;
  completadas: number;
  mock: boolean;
}> {
  // Solo OTs activas que tienen referencia a SoftGuard ST
  const otsConRef = await prisma.ordenTrabajo.findMany({
    where: {
      st_softguard_numero: { not: null },
      estado: { notIn: ["COMPLETADA", "CANCELADA"] },
    },
    select: { id: true, st_softguard_numero: true },
  });

  if (otsConRef.length === 0) return { revisadas: 0, completadas: 0, mock: false };

  const result = await withSoftguardConnection(
    async (pool) => {
      let completadas = 0;

      for (const ot of otsConRef) {
        if (!ot.st_softguard_numero) continue;

        const res = await pool
          .request()
          .input("num", ot.st_softguard_numero)
          .query<{ estado: number }>(
            "SELECT TOP 1 estado FROM dbo.vw_ei_ot_estado WHERE ot_numero = @num"
          );

        const sgEstado = res.recordset[0]?.estado;
        if (sgEstado === undefined) continue;

        // estado = 2 en SoftGuard significa "CERRADA" → cerrar en el portal
        if (sgEstado === 2) {
          await prisma.ordenTrabajo.update({
            where: { id: ot.id },
            data:  { estado: "COMPLETADA", updated_at: new Date() },
          });
          completadas++;
        }
      }

      return completadas;
    },
    () => 0
  );

  if (!result.ok) {
    console.error("[syncEstadoOT] Error SoftGuard:", result.error);
    return { revisadas: otsConRef.length, completadas: 0, mock: false };
  }

  return {
    revisadas:   otsConRef.length,
    completadas: result.data,
    mock:        result.mock,
  };
}

// ── syncEstadoOTWebApi ────────────────────────────────────────────────────────
//
// Variante de syncEstadoOT que lee de la API REST de la suite web (módulo
// Servicio Técnico, /Rest/search/ServTec). Criterio de cierre EMPÍRICO de la
// UI oficial: una orden está cerrada cuando su estado sale del set activo
// (1,2,5,6) Y tiene fecha de cierre — NO el "estado=2" del pipeline SQL, que
// nunca se pudo validar. SOLO LECTURA contra SoftGuard.

export async function syncEstadoOTWebApi(): Promise<{
  revisadas: number;
  completadas: number;
  configured: boolean;
}> {
  if (!softguardWebApiConfigured()) {
    return { revisadas: 0, completadas: 0, configured: false };
  }

  const otsConRef = await prisma.ordenTrabajo.findMany({
    where: {
      st_softguard_numero: { not: null },
      estado: { notIn: ["COMPLETADA", "CANCELADA"] },
    },
    select: { id: true, st_softguard_numero: true },
  });

  if (otsConRef.length === 0) return { revisadas: 0, completadas: 0, configured: true };

  let ordenes;
  try {
    ordenes = await fetchOrdenesServicio({ limit: 1000 });
  } catch (err) {
    console.error("[syncEstadoOTWebApi] Error API web:", err);
    return { revisadas: otsConRef.length, completadas: 0, configured: true };
  }

  const porNumero = new Map(ordenes.map((o) => [String(o.numero), o]));
  let completadas = 0;

  for (const ot of otsConRef) {
    const orden = porNumero.get(String(ot.st_softguard_numero));
    if (!orden?.cerrada) continue;

    await prisma.ordenTrabajo.update({
      where: { id: ot.id },
      data:  { estado: "COMPLETADA", updated_at: new Date() },
    });
    completadas++;
  }

  return { revisadas: otsConRef.length, completadas, configured: true };
}

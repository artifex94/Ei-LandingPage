/**
 * Adaptador del módulo MONITOREO (MultiMonitor Web / Monitoreo Web Remoto).
 *
 * Funcionalidades cubiertas (solo lectura):
 *   - fetchEventosHistoricoMM  → últimos eventos recibidos (grilla del multimonitor)
 *   - fetchEventosPendientes   → cola de alarmas SIN ATENDER (se vacía al procesarlas)
 *   - fetchCodigosAlarma       → catálogo código → descripción/prioridad/tipo
 *
 * Shapes verificados con datos reales el 2026-06-10. OJO: los campos del
 * histórico y de pendientes difieren en mayúsculas (rec_iPrioridad vs
 * rec_iprioridad, rec_isoFechaHora vs rec_isofechahora).
 */

import { readConfig, restGet, s, num, refCuenta } from "./core";
import { parseFechaSoftguard } from "@/lib/fecha-ar";

// ── Tipos crudos (campos reales del modelo ExtJS) ────────────────────────────────

interface RawCodigoAlarma {
  cod_ccodigo: string; cod_cdescripcion: string; cod_nprioridad: string;
  cod_ntipo: string; cod_nMultiMonitor: string;
}

interface RawEventoPendiente {
  rec_iid: number | string; rec_iidcuenta: number | string;
  cue_ncuenta: string; cue_cnombre: string; cue_ccalle?: string;
  cue_clocalidad?: string; cue_cprovincia?: string; cue_clinea?: string;
  rec_calarma: string; rec_czona?: string; zon_cdescripcion?: string;
  rec_iprioridad?: number | string; rec_isofechahora?: string; rec_tfechahora?: string;
  rec_ccontenido?: string; rec_cobservaciones?: string;
  rec_ioperador?: number | string; rec_nestado?: number | string;
}

interface RawEventoHistorico {
  rec_iid: number | string; rec_iidcuenta: number | string;
  cue_clinea?: string; cue_ncuenta: string; cue_cnombre: string;
  rec_calarma: string; rec_czona?: string; zon_cdescripcion?: string;
  rec_iPrioridad?: number | string; cod_nprioridad?: number | string;
  rec_isoFechaHora?: string; rec_tfechahora?: string;
  rec_cContenido?: string; rec_cObservaciones?: string;
  cod_cdescripcion?: string;
  rec_ioperador?: number | string; rec_nestado?: number | string;
}

// ── Salida normalizada (lista para mapear a EventoAlarma) ────────────────────────

export interface WebEvento {
  id_evento: string;
  iid_cuenta: number;
  softguard_ref: string;
  titular: string;
  fecha_evento: Date;
  codigo: string;            // rec_calarma (alfanumérico, ej. "V16")
  descripcion: string;       // del catálogo codigosalarmas, o rec_ccontenido
  zona: string | null;       // zon_cdescripcion || rec_czona
  prioridad: number | null;
  operador_id: string | null;
  observacion: string | null;
  estado_raw: string | null;
}

/** Catálogo de códigos de alarma → mapa código → {descripcion, prioridad, tipo}. */
export async function fetchCodigosAlarma(): Promise<Map<string, { descripcion: string; prioridad: number; tipo: number }>> {
  const c = readConfig();
  const res = await restGet<RawCodigoAlarma>(c, "/rest/search/codigosalarmas", { page: 1, start: 0, limit: 5000 });
  const map = new Map<string, { descripcion: string; prioridad: number; tipo: number }>();
  for (const r of res.rows) {
    map.set(s(r.cod_ccodigo), {
      descripcion: s(r.cod_cdescripcion),
      prioridad: num(r.cod_nprioridad) ?? 0,
      tipo: num(r.cod_ntipo) ?? 0,
    });
  }
  return map;
}

/**
 * Últimos eventos recibidos por la central (grilla del MultiMonitor Web).
 * Solo lectura: es la misma query GET que dispara la UI oficial, con
 * cod_nMultiMonitor=1 (códigos marcados para mostrarse en el multimonitor)
 * y orden por fecha de recepción descendente. La respuesta ya incluye la
 * descripción legible (cod_cdescripcion), sin necesidad del catálogo.
 */
export async function fetchEventosHistoricoMM(limit = 50): Promise<WebEvento[]> {
  const c = readConfig();
  const res = await restGet<RawEventoHistorico>(c, "/Rest/Search/ReporteHistoricoMM", {
    cod_nMultiMonitor: 1,
    Origenes: "", Estados: "", Tipos: "", short: 1,
    cue_clinea: "", Prioridad: "", cue_ncuenta: "",
    Operador: "", OperadorNot: "",
    Mostrar: limit,
    FechaDesde: "", FechaHasta: "", cod_cgrupoExcluir: "",
    extramonth: "false",
    page: 1, start: 0, limit,
    sort: '[{"property":"r.rec_tfechahora","direction":"DESC"}]',
  });
  return res.rows.map((r) => {
    const codigo = s(r.rec_calarma);
    const fecha = r.rec_isoFechaHora || r.rec_tfechahora || "";
    return {
      id_evento:     s(r.rec_iid),
      iid_cuenta:    num(r.rec_iidcuenta) ?? 0,
      softguard_ref: refCuenta(r.cue_clinea, r.cue_ncuenta),
      titular:       s(r.cue_cnombre),
      fecha_evento:  fecha ? parseFechaSoftguard(fecha) : new Date(),
      codigo,
      descripcion:   s(r.cod_cdescripcion) || s(r.rec_cContenido) || codigo,
      // Nombre de zona (zon_cdescripcion) si la cuenta la tiene nombrada; si no, el número.
      zona:          s(r.zon_cdescripcion) || s(r.rec_czona) || null,
      prioridad:     num(r.rec_iPrioridad) ?? num(r.cod_nprioridad),
      operador_id:   r.rec_ioperador != null ? s(r.rec_ioperador) : null,
      observacion:   s(r.rec_cObservaciones) || null,
      estado_raw:    r.rec_nestado != null ? s(r.rec_nestado) : null,
    };
  });
}

/**
 * Eventos pendientes (cola de alarmas SIN ATENDER del multimonitor — se vacía
 * cuando los operadores procesan). Para el feed de "eventos que van llegando"
 * usar fetchEventosHistoricoMM. Si se pasa el catálogo de códigos, completa
 * la descripción legible.
 */
export async function fetchEventosPendientes(
  catalogo?: Map<string, { descripcion: string; prioridad: number; tipo: number }>,
  limit = 200,
): Promise<WebEvento[]> {
  const c = readConfig();
  const res = await restGet<RawEventoPendiente>(c, "/Rest/search/EventosPendientes", { page: 1, start: 0, limit });
  return res.rows.map((r) => {
    const codigo = s(r.rec_calarma);
    const meta = catalogo?.get(codigo);
    const fecha = r.rec_isofechahora || r.rec_tfechahora || "";
    return {
      id_evento:     s(r.rec_iid),
      iid_cuenta:    num(r.rec_iidcuenta) ?? 0,
      softguard_ref: refCuenta(r.cue_clinea, r.cue_ncuenta),
      titular:       s(r.cue_cnombre),
      fecha_evento:  fecha ? parseFechaSoftguard(fecha) : new Date(),
      codigo,
      descripcion:   meta?.descripcion || s(r.rec_ccontenido) || codigo,
      zona:          s(r.zon_cdescripcion) || s(r.rec_czona) || null,
      prioridad:     num(r.rec_iprioridad) ?? meta?.prioridad ?? null,
      operador_id:   r.rec_ioperador != null ? s(r.rec_ioperador) : null,
      observacion:   s(r.rec_cobservaciones) || null,
      estado_raw:    r.rec_nestado != null ? s(r.rec_nestado) : null,
    };
  });
}

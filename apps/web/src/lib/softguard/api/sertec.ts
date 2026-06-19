/**
 * Adaptador del módulo SERVICIO TÉCNICO (SerTec) — órdenes de servicio de la central.
 *
 * Funcionalidades cubiertas (solo lectura):
 *   - fetchOrdenesServicio      → órdenes (cabecera st) con estado y fecha de cierre
 *   - fetchOrdenesServicioCount → total visible
 *
 * Endpoint: GET /Rest/search/ServTec (modelo stc_* = st_cabecera).
 * Shape validado con datos reales 2026-06-10.
 *
 * SEMÁNTICA DE ESTADOS (empírica, de la UI oficial): la grilla de órdenes
 * ACTIVAS filtra `stc_nestado:inint = "1,2,5,6"`. La única orden cerrada real
 * observada tiene stc_nestado=4 + stc_dfecha_cierre poblada. OJO: esto
 * contradice el comentario del pipeline SQL ("estado=2 = CERRADA"), que nunca
 * se pudo validar por el firewall — el criterio bueno es el de la UI.
 */

import { readConfig, restGet, s, num, fecha } from "./core";

/** Estados que la UI oficial de SerTec considera activos (orden abierta). */
const ESTADOS_ACTIVOS_ST = new Set([1, 2, 5, 6]);

interface RawServTec {
  stc_inumero: number | string;
  stc_iid_cuenta: number | string;
  stc_ctipo_servicio?: string;
  stc_nestado: number | string;
  stc_mobservaciones?: string;
  stc_ctecnico_1?: string;
  stc_yValor?: number | string;
  stc_dfecha_cierre?: string;
  stc_dfecha_modificacion?: string;
  stf_dfecha_vto_orden?: string;
}

export interface WebOrdenServicio {
  numero: number;             // stc_inumero — lo referencia OrdenTrabajo.st_softguard_numero
  iid_cuenta: number;
  tipo_servicio: string | null;
  estado_raw: number;         // stc_nestado crudo
  activa: boolean;            // estado ∈ {1,2,5,6} (criterio de la grilla oficial)
  cerrada: boolean;           // no activa + fecha de cierre válida
  observaciones: string | null;
  tecnico: string | null;
  valor: number | null;
  fecha_cierre: Date | null;
  fecha_modificacion: Date | null;
  vencimiento: Date | null;
}

function mapOrden(r: RawServTec): WebOrdenServicio {
  const estado = num(r.stc_nestado) ?? 0;
  const activa = ESTADOS_ACTIVOS_ST.has(estado);
  const fecha_cierre = fecha(r.stc_dfecha_cierre);
  return {
    numero:             num(r.stc_inumero) ?? 0,
    iid_cuenta:         num(r.stc_iid_cuenta) ?? 0,
    tipo_servicio:      s(r.stc_ctipo_servicio) || null,
    estado_raw:         estado,
    activa,
    cerrada:            !activa && fecha_cierre !== null,
    observaciones:      s(r.stc_mobservaciones) || null,
    tecnico:            s(r.stc_ctecnico_1) || null,
    valor:              num(r.stc_yValor),
    fecha_cierre,
    fecha_modificacion: fecha(r.stc_dfecha_modificacion),
    vencimiento:        fecha(r.stf_dfecha_vto_orden),
  };
}

/**
 * Órdenes de servicio técnico de la central, más recientes primero.
 * `soloActivas` replica el filtro de la grilla oficial (estados 1,2,5,6).
 */
export async function fetchOrdenesServicio(opts?: {
  soloActivas?: boolean;
  limit?: number;
}): Promise<WebOrdenServicio[]> {
  const c = readConfig();
  const params: Record<string, string | number> = {
    page: 1, start: 0, limit: opts?.limit ?? 500,
    sort: '[{"property":"stc_dfecha_modificacion","direction":"DESC"}]',
  };
  if (opts?.soloActivas) {
    params.filter = '[{"property":"stc_nestado:inint","value":"1,2,5,6"}]';
  }
  const res = await restGet<RawServTec>(c, "/Rest/search/ServTec", params);
  return res.rows.map(mapOrden);
}

/** Total de órdenes de servicio visibles (sin filtro). */
export async function fetchOrdenesServicioCount(): Promise<number> {
  const c = readConfig();
  const res = await restGet<unknown>(c, "/Rest/search/ServTec", { page: 1, start: 0, limit: 1 });
  return res.total;
}

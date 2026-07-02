"use client";

/**
 * Vista extensa de monitoreo para operadores (/admin/monitoreo).
 *
 * Board de cuatro columnas en vivo sobre el mismo feed (`useEventosLive`, poll 10 s):
 * Todos · P1 crítica · P2 · Resto. En desktop (xl) se ven las cuatro a la vez (P1 nunca
 * queda oculta); en mobile colapsan a pestañas (arrancan en P1). El buscador y "Solo
 * pendientes" filtran las cuatro a la vez.
 *
 * Al tocar un evento (de cualquier columna) se abre un drawer con el contexto del cliente
 * en el PORTAL (teléfono, estado del panel, OTs y solicitudes abiertas) y la acción de
 * notificar por WhatsApp — disponible para cualquier criticidad, con el texto acorde.
 *
 * SOLO LECTURA contra SoftGuard: procesar eventos sigue siendo manual en la suite.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, MessageCircle, Phone, RefreshCw, Search, X } from "lucide-react";
import type { EventoLive } from "@/app/api/admin/eventos-live/route";
import type { CuentaContextoResponse } from "@/app/api/admin/cuenta-contexto/route";
import type { ContactosCuentaResponse } from "@/app/api/admin/contactos-cuenta/route";
import type { WebContactoCuenta } from "@/lib/softguard/api";
import { BarraVidaUtil, EstadoConexion, EstadoEvento } from "./MultiMonitorLive";
import { NotificarWhatsAppModal } from "./NotificarWhatsAppModal";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import {
  clasificarCodigo,
  protocoloParaClasificacion,
  type TipoGestionEvento,
} from "@/lib/eventos-clasificacion";
import {
  registrarGestionEvento,
  getGestionesEvento,
  type GestionEventoItem,
} from "@/lib/actions/eventos";
import {
  useEventosLive,
  filtrarEventos,
  eventosAgrupadosCuenta,
  etiquetaCuentaUi,
  hora,
  horaConDia,
  prioridadStyle,
  COLUMNAS_MONITOREO,
  type ColumnaKey,
  type ColumnaMonitoreo,
  type EstadoCentral,
} from "./eventos-live";

const LIMIT_OPERADORES = 80;

export function MonitorOperadores() {
  const { data, estado, reconectando, flashIds, poll } = useEventosLive(LIMIT_OPERADORES);
  const [q, setQ] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [tabActiva, setTabActiva] = useState<ColumnaKey>("p1");
  const [seleccionado, setSeleccionado] = useState<EventoLive | null>(null);

  const base = useMemo(() => data?.eventos ?? [], [data]);
  // Referencia de tiempo para la barra de vida útil: el `at` del feed (render puro, sin Date.now()).
  const refMs = data ? Date.parse(data.at) : 0;

  // Una request, cuatro listas: cada columna es el mismo feed con su filtro de prioridad,
  // compartiendo `q` y `soloPendientes`.
  const porColumna = useMemo(() => {
    const out = {} as Record<ColumnaKey, EventoLive[]>;
    for (const col of COLUMNAS_MONITOREO) {
      out[col.key] = filtrarEventos(base, { q, prioridad: col.prioridad, soloPendientes });
    }
    return out;
  }, [base, q, soloPendientes]);

  // En móvil el contexto aparece como drawer superpuesto; Escape lo cierra.
  useEffect(() => {
    if (!seleccionado) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeleccionado(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seleccionado]);

  const seleccionar = (e: EventoLive) =>
    setSeleccionado((prev) => (prev?.id === e.id ? null : e));

  return (
    <div className="space-y-3">
      <Toolbar
        estado={estado}
        actualizado={data?.at ?? null}
        reconectando={reconectando}
        onReconectar={() => void poll({ relogin: true })}
        q={q}
        onQ={setQ}
        soloPendientes={soloPendientes}
        onSoloPendientes={setSoloPendientes}
      />

      {estado === "caido" && (
        <p className="text-[11px] text-red-400/80 px-1">
          Sin conexión con la central{base.length > 0 ? " — mostrando lo último sincronizado." : "."}{" "}
          Se reintenta solo; el botón ↻ fuerza un login nuevo.
        </p>
      )}

      {estado === "cargando" ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4" aria-hidden="true">
          {COLUMNAS_MONITOREO.map((col) => (
            <div key={col.key} className={`${tabActiva === col.key ? "block" : "hidden"} xl:block`}>
              <div className="h-64 rounded-xl bg-slate-800/40 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Pestañas — solo mobile/tablet (< xl). */}
          <div role="tablist" aria-label="Columnas de eventos" className="flex gap-1 xl:hidden">
            {COLUMNAS_MONITOREO.map((col) => (
              <button
                key={col.key}
                type="button"
                role="tab"
                aria-selected={tabActiva === col.key}
                onClick={() => setTabActiva(col.key)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors min-h-[34px] ${
                  tabActiva === col.key
                    ? "bg-orange-500/20 text-orange-300 border border-orange-700/60"
                    : "text-slate-400 hover:text-white border border-transparent"
                }`}
              >
                {col.label}
                <span className="ml-1 text-slate-500 tabular-nums">{porColumna[col.key].length}</span>
              </button>
            ))}
          </div>

          {/* Board — cuatro columnas en xl; una (la pestaña activa) en mobile. */}
          <div className="grid grid-cols-1 gap-3 items-start xl:grid-cols-4">
            {COLUMNAS_MONITOREO.map((col) => (
              <div key={col.key} className={`${tabActiva === col.key ? "block" : "hidden"} xl:block min-w-0`}>
                <ColumnaEventos
                  col={col}
                  eventos={porColumna[col.key]}
                  flashIds={flashIds}
                  seleccionadoId={seleccionado?.id ?? null}
                  onSelect={seleccionar}
                  estado={estado}
                  refMs={refMs}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Drawer de contexto + acción (overlay; no ocupa ancho del board). */}
      {seleccionado && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setSeleccionado(null)}
            aria-hidden="true"
          />
          <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-industrial-900 p-3 shadow-2xl xl:inset-y-0 xl:left-auto xl:right-0 xl:bottom-auto xl:w-[400px] xl:max-h-none xl:rounded-none xl:rounded-l-2xl xl:border-t-0 xl:border-l xl:p-4">
            <PanelContexto evento={seleccionado} eventos={base} onCerrar={() => setSeleccionado(null)} />
          </aside>
        </>
      )}
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({
  estado,
  actualizado,
  reconectando,
  onReconectar,
  q,
  onQ,
  soloPendientes,
  onSoloPendientes,
}: {
  estado: EstadoCentral;
  actualizado: string | null;
  reconectando: boolean;
  onReconectar: () => void;
  q: string;
  onQ: (v: string) => void;
  soloPendientes: boolean;
  onSoloPendientes: (v: boolean) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/40 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <EstadoConexion estado={estado} />
        {actualizado && (
          <span className="text-[10px] text-slate-600 tabular-nums">actualizado {hora(actualizado)}</span>
        )}
      </div>

      <div className="flex items-center gap-3 sm:flex-1 sm:justify-end">
        <div className="relative flex-1 sm:flex-none sm:min-w-[180px] sm:max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Cuenta o titular…"
            aria-label="Buscar por cuenta o titular"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 text-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => onSoloPendientes(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900"
          />
          Solo pendientes
        </label>

        <button
          type="button"
          onClick={onReconectar}
          disabled={reconectando}
          title="Reconectar con la central (login nuevo)"
          className="p-1.5 -m-1 text-slate-500 hover:text-orange-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${reconectando ? "animate-spin" : ""}`} aria-hidden="true" />
          <span className="sr-only">Reconectar con la central</span>
        </button>
      </div>
    </section>
  );
}

// ── Columna del board ─────────────────────────────────────────────────────────

function ColumnaEventos({
  col,
  eventos,
  flashIds,
  seleccionadoId,
  onSelect,
  estado,
  refMs,
}: {
  col: ColumnaMonitoreo;
  eventos: EventoLive[];
  flashIds: Set<string>;
  seleccionadoId: string | null;
  onSelect: (e: EventoLive) => void;
  estado: EstadoCentral;
  refMs: number;
}) {
  return (
    <section
      aria-label={`Columna ${col.label}`}
      className="rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-800/50 to-slate-900/40"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-700/50">
        <span className={`text-[11px] font-bold uppercase tracking-widest ${col.acento}`}>{col.label}</span>
        <span className="text-[10px] text-slate-500 tabular-nums">{eventos.length}</span>
      </header>

      {eventos.length === 0 ? (
        <p className="text-[11px] text-slate-600 px-3 py-8 text-center">
          {estado === "caido" ? "Sin datos." : "Sin eventos."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-800/60 max-h-[70vh] overflow-y-auto" aria-label={`Eventos ${col.label}`}>
          {eventos.map((e) => (
            <FilaOperador
              key={e.id}
              evento={e}
              flash={flashIds.has(e.id)}
              seleccionado={seleccionadoId === e.id}
              onSelect={() => onSelect(e)}
              refMs={refMs}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Fila de evento (clickeable, con selección) ────────────────────────────────

function FilaOperador({
  evento,
  flash,
  seleccionado,
  onSelect,
  refMs,
}: {
  evento: EventoLive;
  flash: boolean;
  seleccionado: boolean;
  onSelect: () => void;
  refMs: number;
}) {
  const p = prioridadStyle(evento.prioridad);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={seleccionado}
        className={`relative w-full text-left flex items-baseline gap-2 px-3 py-2.5 transition-colors duration-700 ${
          seleccionado
            ? "bg-orange-500/10 ring-1 ring-inset ring-orange-700/50"
            : flash
              ? "bg-orange-500/10"
              : "hover:bg-slate-800/40"
        }`}
        style={{ borderLeft: `2px solid ${p.borde}` }}
      >
        <time
          dateTime={evento.fecha}
          className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0"
        >
          {horaConDia(evento.fecha)}
        </time>
        <span
          className={`font-mono text-[10px] font-bold rounded border px-1.5 py-px shrink-0 ${p.badge}`}
          title={`Código ${evento.codigo}`}
        >
          {evento.codigo}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold truncate ${p.texto}`}>{evento.descripcion}</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {evento.titular}
            <span className="text-slate-700"> · #{evento.softguard_ref}</span>
            {evento.zona && <span className="text-slate-600"> · {evento.zona}</span>}
          </p>
          {/* Titular con varias cuentas activas: aclarar de QUÉ propiedad es el evento. */}
          {evento.titularMultiCuenta && (
            <Badge variant="info" className="mt-1 max-w-full truncate text-[10px]">
              {etiquetaCuentaUi(evento)}
            </Badge>
          )}
        </div>
        {!evento.procesado && <EstadoEvento procesado={false} />}
        <BarraVidaUtil evento={evento} refMs={refMs} />
      </button>
    </li>
  );
}

// ── Panel de contexto del portal ──────────────────────────────────────────────

type EstadoContexto =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "ok"; data: CuentaContextoResponse };

function PanelContexto({ evento, eventos, onCerrar }: { evento: EventoLive; eventos: EventoLive[]; onCerrar: () => void }) {
  const [ctx, setCtx] = useState<EstadoContexto>({ tipo: "cargando" });
  const [notificando, setNotificando] = useState(false);
  const cacheRef = useRef(new Map<string, CuentaContextoResponse>());

  useEffect(() => {
    const ref = evento.softguard_ref;
    const cacheado = cacheRef.current.get(ref);
    if (cacheado) {
      setCtx({ tipo: "ok", data: cacheado });
      return;
    }
    let cancelado = false;
    setCtx({ tipo: "cargando" });
    fetch(`/api/admin/cuenta-contexto?ref=${encodeURIComponent(ref)}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CuentaContextoResponse>;
      })
      .then((data) => {
        cacheRef.current.set(ref, data);
        if (!cancelado) setCtx({ tipo: "ok", data });
      })
      .catch(() => {
        if (!cancelado) setCtx({ tipo: "error" });
      });
    return () => {
      cancelado = true;
    };
  }, [evento.softguard_ref]);

  const p = prioridadStyle(evento.prioridad);

  return (
    <section
      aria-label={`Contexto de la cuenta ${evento.softguard_ref}`}
      className="rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/40 p-4 space-y-4"
    >
      {/* Evento seleccionado */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[10px] font-bold rounded border px-1.5 py-px ${p.badge}`}>
              {evento.codigo}
            </span>
            <EstadoEvento procesado={evento.procesado} />
          </div>
          <p className={`text-sm font-semibold mt-2 ${p.texto}`}>{evento.descripcion}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {horaConDia(evento.fecha)}
            {evento.zona && <span> · {evento.zona}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 p-1.5 -m-1 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Cerrar panel</span>
        </button>
      </div>

      {/* Acción de notificación — disponible para cualquier criticidad. */}
      <button
        type="button"
        onClick={() => setNotificando(true)}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-200 text-sm font-semibold px-3 py-2.5 transition-colors"
      >
        <MessageCircle className="w-4 h-4" aria-hidden="true" />
        Notificar por WhatsApp
      </button>

      <ProtocoloEvento evento={evento} />

      <div className="border-t border-slate-700/50 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          Cuenta #{evento.softguard_ref} en el portal
        </p>

        {ctx.tipo === "cargando" && (
          <div className="space-y-2 py-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 rounded bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {ctx.tipo === "error" && (
          <p className="text-xs text-red-400/80 py-2">
            No se pudo cargar el contexto. Reintentá seleccionando el evento de nuevo.
          </p>
        )}

        {ctx.tipo === "ok" && !ctx.data.encontrada && (
          <p className="text-xs text-slate-500 py-2">
            Esta cuenta de la central no tiene espejo en el portal (línea interna o
            cuenta sin importar).
          </p>
        )}

        {ctx.tipo === "ok" && ctx.data.cuenta && (
          <ContenidoContexto cuenta={ctx.data.cuenta} titular={evento.titular} />
        )}
      </div>

      {notificando && (
        <NotificarWhatsAppModal
          evento={evento}
          eventosGrupo={eventosAgrupadosCuenta(eventos, evento)}
          onClose={() => setNotificando(false)}
        />
      )}
    </section>
  );
}

// ── Protocolo guiado de actuación (Fase 7b) ─────────────────────────────────────
//
// Checklist de pasos según la clasificación del código Contact ID del evento
// (`protocoloParaClasificacion`). Cada paso de llamada expande los contactos
// priorizados de la cuenta (mismo endpoint que usa `NotificarWhatsAppModal`,
// `/api/admin/contactos-cuenta`) con 1 tap por resultado; los demás pasos
// tienen un único botón "Hecho". NO reemplaza `resolucion` (texto libre): la
// complementa con registro estructurado (`registrarGestionEvento`).

const ETIQUETA_TIPO_GESTION: Record<string, string> = {
  LLAMADA_CONTACTO: "Llamada",
  WHATSAPP_CONTACTO: "WhatsApp",
  VERIFICACION_CAMARA: "Cámara",
  AVISO_POLICIA: "Aviso a policía",
  OTRO: "Otro",
};

const ETIQUETA_RESULTADO: Record<string, { label: string; variant: BadgeVariant }> = {
  ATENDIO: { label: "Atendió", variant: "success" },
  HECHO: { label: "Hecho", variant: "success" },
  NO_ATENDIO: { label: "No atendió", variant: "warning" },
  OCUPADO: { label: "Ocupado", variant: "neutral" },
  SIN_RESPUESTA: { label: "Sin respuesta", variant: "neutral" },
};

type EstadoContactosProtocolo =
  | { tipo: "idle" }
  | { tipo: "cargando" }
  | { tipo: "ok"; contactos: WebContactoCuenta[] }
  | { tipo: "error" };

function ProtocoloEvento({ evento }: { evento: EventoLive }) {
  const pasos = useMemo(
    () => protocoloParaClasificacion(clasificarCodigo(evento.codigo)),
    [evento.codigo],
  );
  const tieneLlamadas = pasos.some((p) => p.tipo === "LLAMADA_CONTACTO");

  const [contactos, setContactos] = useState<EstadoContactosProtocolo>({ tipo: "idle" });
  const [gestiones, setGestiones] = useState<GestionEventoItem[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  const cargarHistorial = useCallback(() => {
    let cancelado = false;
    getGestionesEvento(evento.id)
      .then((data) => {
        if (!cancelado) setGestiones(data);
      })
      .finally(() => {
        if (!cancelado) setCargandoHistorial(false);
      });
    return () => {
      cancelado = true;
    };
  }, [evento.id]);

  useEffect(() => {
    let cancelado = false;
    queueMicrotask(() => {
      if (!cancelado) setCargandoHistorial(true);
    });
    const limpiar = cargarHistorial();
    return () => {
      cancelado = true;
      limpiar();
    };
  }, [cargarHistorial]);

  useEffect(() => {
    if (!tieneLlamadas) return;
    let cancelado = false;
    queueMicrotask(() => {
      if (!cancelado) setContactos({ tipo: "cargando" });
    });
    const params = new URLSearchParams();
    if (evento.softguard_ref) params.set("ref", evento.softguard_ref);
    if (evento.iid_cuenta) params.set("iid", String(evento.iid_cuenta));
    fetch(`/api/admin/contactos-cuenta?${params.toString()}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ContactosCuentaResponse>;
      })
      .then((data) => {
        if (!cancelado) setContactos({ tipo: "ok", contactos: data.contactos });
      })
      .catch(() => {
        if (!cancelado) setContactos({ tipo: "error" });
      });
    return () => {
      cancelado = true;
    };
  }, [tieneLlamadas, evento.softguard_ref, evento.iid_cuenta]);

  if (pasos.length === 0) return null;

  return (
    <div className="border-t border-slate-700/50 pt-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Protocolo de actuación
      </p>
      <ol className="space-y-2">
        {pasos.map((paso, i) => (
          <li key={i} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
            <p className="text-xs font-semibold text-slate-200 mb-1.5">
              <span className="text-slate-500 mr-1.5 tabular-nums">{i + 1}.</span>
              {paso.etiqueta}
            </p>
            {paso.tipo === "LLAMADA_CONTACTO" ? (
              <PasoLlamadas
                eventoId={evento.id}
                contactos={contactos}
                onRegistrado={cargarHistorial}
              />
            ) : (
              <PasoGenerico eventoId={evento.id} tipo={paso.tipo} onRegistrado={cargarHistorial} />
            )}
          </li>
        ))}
      </ol>

      {!cargandoHistorial && gestiones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Historial de gestión
          </p>
          <ul className="space-y-1">
            {gestiones.map((g) => {
              const res = ETIQUETA_RESULTADO[g.resultado] ?? { label: g.resultado, variant: "neutral" as const };
              return (
                <li key={g.id} className="flex items-center gap-1.5 text-[11px] min-w-0">
                  <span className="text-slate-600 tabular-nums shrink-0">{horaConDia(g.created_at)}</span>
                  <span className="text-slate-500 shrink-0">{ETIQUETA_TIPO_GESTION[g.tipo] ?? g.tipo}</span>
                  {g.destino && <span className="text-slate-300 truncate min-w-0">· {g.destino}</span>}
                  <Badge variant={res.variant} className="ml-auto shrink-0">
                    {res.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function PasoLlamadas({
  eventoId,
  contactos,
  onRegistrado,
}: {
  eventoId: string;
  contactos: EstadoContactosProtocolo;
  onRegistrado: () => void;
}) {
  if (contactos.tipo === "idle" || contactos.tipo === "cargando") {
    return <p className="text-[11px] text-slate-600">Cargando contactos…</p>;
  }
  if (contactos.tipo === "error") {
    return <p className="text-[11px] text-red-400/80">No se pudieron cargar los contactos.</p>;
  }
  if (contactos.contactos.length === 0) {
    return <p className="text-[11px] text-slate-600">Esta cuenta no tiene contactos cargados.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {contactos.contactos.map((c, i) => (
        <ContactoLlamada key={i} eventoId={eventoId} contacto={c} onRegistrado={onRegistrado} />
      ))}
    </ul>
  );
}

const RESULTADOS_LLAMADA = [
  { valor: "ATENDIO", label: "Atendió", clase: "border-emerald-700/60 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/40" },
  { valor: "NO_ATENDIO", label: "No atendió", clase: "border-amber-700/60 bg-amber-950/40 text-amber-200 hover:bg-amber-900/40" },
  { valor: "OCUPADO", label: "Ocupado", clase: "border-slate-600 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60" },
] as const;

function ContactoLlamada({
  eventoId,
  contacto,
  onRegistrado,
}: {
  eventoId: string;
  contacto: WebContactoCuenta;
  onRegistrado: () => void;
}) {
  const [pending, start] = useTransition();
  const [registrado, setRegistrado] = useState<string | null>(null);

  function registrar(resultado: string) {
    start(async () => {
      const destino = `${contacto.nombre}${contacto.telefono ? ` (${contacto.telefono})` : ""}`;
      const r = await registrarGestionEvento({
        evento_id: eventoId,
        tipo: "LLAMADA_CONTACTO",
        destino,
        resultado,
      });
      if (!r.error) {
        setRegistrado(resultado);
        onRegistrado();
      }
    });
  }

  return (
    <li className="rounded border border-slate-700/40 bg-slate-800/40 px-2 py-1.5">
      <p className="text-[11px] text-slate-300 truncate">
        {contacto.nombre}
        {contacto.rol && <span className="text-slate-500"> · {contacto.rol}</span>}
      </p>
      {contacto.telefono && (
        <p className="text-[10px] text-slate-500 font-mono">{contacto.telefono}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {RESULTADOS_LLAMADA.map((r) => (
          <button
            key={r.valor}
            type="button"
            disabled={pending}
            onClick={() => registrar(r.valor)}
            className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors min-h-[30px] disabled:opacity-50 ${
              registrado === r.valor ? r.clase : "border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            {registrado === r.valor ? `✓ ${r.label}` : r.label}
          </button>
        ))}
      </div>
    </li>
  );
}

function PasoGenerico({
  eventoId,
  tipo,
  onRegistrado,
}: {
  eventoId: string;
  tipo: TipoGestionEvento;
  onRegistrado: () => void;
}) {
  const [pending, start] = useTransition();
  const [hecho, setHecho] = useState(false);

  function registrar() {
    start(async () => {
      const r = await registrarGestionEvento({ evento_id: eventoId, tipo, resultado: "HECHO" });
      if (!r.error) {
        setHecho(true);
        onRegistrado();
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending || hecho}
      onClick={registrar}
      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors min-h-[32px] disabled:opacity-50 ${
        hecho
          ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-200"
          : "border-slate-600 bg-slate-700 hover:bg-slate-600 text-white"
      }`}
    >
      {hecho ? "✓ Hecho" : pending ? "Guardando…" : "Hecho"}
    </button>
  );
}

function ContenidoContexto({
  cuenta,
  titular,
}: {
  cuenta: NonNullable<CuentaContextoResponse["cuenta"]>;
  titular: string;
}) {
  return (
    <div className="space-y-4">
      {/* Cliente */}
      <div>
        <p className="text-sm font-semibold text-white">{cuenta.cliente.nombre || titular}</p>
        <p className="text-xs text-slate-400 mt-0.5">{cuenta.descripcion}</p>
        {cuenta.direccion && <p className="text-xs text-slate-500 mt-0.5">{cuenta.direccion}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          {cuenta.cliente.telefono && (
            <a
              href={`tel:${cuenta.cliente.telefono}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-2.5 py-1.5 transition-colors"
            >
              <Phone className="w-3 h-3" aria-hidden="true" />
              {cuenta.cliente.telefono}
            </a>
          )}
          <Link
            href={`/admin/cuentas/${cuenta.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-2.5 py-1.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
            Abrir cuenta
          </Link>
        </div>
      </div>

      {/* Estado del panel (proyección sg_*) */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Panel</p>
        {cuenta.panel.en_fallo_ac && (
          <p className="text-xs font-semibold text-red-300">
            ⚠ Sin 220v (corte de AC)
            {cuenta.panel.fallo_ac_desde && (
              <span className="text-red-400/80 font-normal">
                {" "}desde {horaConDia(cuenta.panel.fallo_ac_desde)}
              </span>
            )}
          </p>
        )}
        {cuenta.panel.en_fallo_tst && (
          <p className="text-xs font-semibold text-amber-300">
            ⚠ Sin reportar test
            {cuenta.panel.fallo_tst_desde && (
              <span className="text-amber-500/80 font-normal">
                {" "}desde {horaConDia(cuenta.panel.fallo_tst_desde)}
              </span>
            )}
          </p>
        )}
        {!cuenta.panel.en_fallo_ac && !cuenta.panel.en_fallo_tst && (
          <p className="text-xs text-emerald-400">✓ Reportando con normalidad</p>
        )}
        {cuenta.panel.ultimo_tst && (
          <p className="text-[11px] text-slate-500">
            Último test: {horaConDia(cuenta.panel.ultimo_tst)}
          </p>
        )}
        {cuenta.panel.ultimo_evento && (
          <p className="text-[11px] text-slate-500 truncate" title={cuenta.panel.ultimo_evento}>
            Último evento: {cuenta.panel.ultimo_evento}
          </p>
        )}
      </div>

      {/* OTs abiertas */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
          OTs abiertas
        </p>
        {cuenta.ots_abiertas.length === 0 ? (
          <p className="text-xs text-slate-600">Sin OTs abiertas.</p>
        ) : (
          <ul className="space-y-1.5">
            {cuenta.ots_abiertas.map((ot) => (
              <li key={ot.id} className="text-xs text-slate-300">
                <span className="font-mono text-slate-500">
                  #{String(ot.numero).padStart(4, "0")}
                </span>{" "}
                <span className="text-slate-500">[{ot.estado}]</span>{" "}
                <span className="line-clamp-1">{ot.descripcion}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Solicitudes de mantenimiento abiertas */}
      {cuenta.solicitudes_abiertas.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Solicitudes de mantenimiento
          </p>
          <ul className="space-y-1.5">
            {cuenta.solicitudes_abiertas.map((sm) => (
              <li key={sm.id} className="text-xs text-slate-400">
                <span className="text-slate-500">[{sm.estado}]</span>{" "}
                <span className="line-clamp-1">{sm.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

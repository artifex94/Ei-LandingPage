"use client";

/**
 * Vista extensa de monitoreo para operadores (/admin/monitoreo).
 *
 * El mismo feed en vivo del dashboard (`useEventosLive`, poll 10 s) a pantalla
 * completa con 50 eventos, filtros client-side (prioridad, solo pendientes,
 * búsqueda por cuenta/titular) y el diferenciador frente a la suite: al
 * seleccionar un evento, un panel lateral cruza la cuenta con los datos del
 * PORTAL (cliente, teléfono, estado del panel, OTs y solicitudes abiertas).
 *
 * SOLO LECTURA contra SoftGuard: procesar eventos sigue siendo manual en la
 * suite. Acá se mira y se decide; la acción vive en el portal (OTs, cuentas).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Phone, RefreshCw, Search, X } from "lucide-react";
import type { EventoLive } from "@/app/api/admin/eventos-live/route";
import type { CuentaContextoResponse } from "@/app/api/admin/cuenta-contexto/route";
import { EstadoConexion, EstadoEvento } from "./MultiMonitorLive";
import {
  useEventosLive,
  filtrarEventos,
  hora,
  horaConDia,
  prioridadStyle,
  FILTROS_INICIALES,
  type FiltrosEventos,
} from "./eventos-live";

const LIMIT_OPERADORES = 50;

export function MonitorOperadores() {
  const { data, estado, reconectando, flashIds, poll } = useEventosLive(LIMIT_OPERADORES);
  const [filtros, setFiltros] = useState<FiltrosEventos>(FILTROS_INICIALES);
  const [seleccionado, setSeleccionado] = useState<EventoLive | null>(null);

  const eventos = useMemo(
    () => filtrarEventos(data?.eventos ?? [], filtros),
    [data, filtros],
  );

  const hayFiltros =
    filtros.q.trim() !== "" || filtros.prioridad !== "todas" || filtros.soloPendientes;

  return (
    <div className="grid gap-4 items-start xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* ── Columna principal: estado + filtros + lista ── */}
      <section className="rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <EstadoConexion estado={estado} />
            {data && (
              <span className="text-[10px] text-slate-600 tabular-nums">
                actualizado {hora(data.at)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 tabular-nums">
              {eventos.length} de {data?.eventos.length ?? 0} eventos
            </span>
            <button
              type="button"
              onClick={() => void poll({ relogin: true })}
              disabled={reconectando}
              title="Reconectar con la central (login nuevo)"
              className="p-1.5 -m-1 text-slate-500 hover:text-orange-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${reconectando ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="sr-only">Reconectar con la central</span>
            </button>
          </div>
        </div>

        <Filtros filtros={filtros} onChange={setFiltros} />

        {estado === "caido" && (
          <p className="text-[11px] text-red-400/80 px-4 py-2">
            Sin conexión con la central{data && data.eventos.length > 0 ? " — mostrando lo último sincronizado." : "."}{" "}
            Se reintenta solo; el botón ↻ fuerza un login nuevo.
          </p>
        )}

        {estado === "cargando" && (
          <div className="space-y-2 p-4" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 rounded bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {data && eventos.length === 0 && estado !== "cargando" && (
          <p className="text-sm text-slate-500 px-4 py-8 text-center">
            {hayFiltros
              ? "Ningún evento coincide con los filtros."
              : estado === "vivo"
                ? "Sin eventos recientes en la central."
                : "Sin eventos sincronizados."}
          </p>
        )}

        {eventos.length > 0 && (
          <ul className="divide-y divide-slate-800/60" aria-label="Eventos de la central">
            {eventos.map((e) => (
              <FilaOperador
                key={e.id}
                evento={e}
                flash={flashIds.has(e.id)}
                seleccionado={seleccionado?.id === e.id}
                onSelect={() => setSeleccionado(seleccionado?.id === e.id ? null : e)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Panel lateral: contexto del portal ── */}
      <aside className="xl:sticky xl:top-6">
        {seleccionado ? (
          <PanelContexto evento={seleccionado} onCerrar={() => setSeleccionado(null)} />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-6 text-center">
            <p className="text-sm text-slate-500">
              Seleccioná un evento para ver el contexto del cliente en el portal:
              teléfono, estado del panel, OTs y solicitudes abiertas.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

// ── Filtros ───────────────────────────────────────────────────────────────────

const PRIORIDADES: { value: FiltrosEventos["prioridad"]; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "1", label: "P1 — crítica" },
  { value: "2", label: "P2" },
  { value: "otras", label: "Resto" },
];

function Filtros({
  filtros,
  onChange,
}: {
  filtros: FiltrosEventos;
  onChange: (f: FiltrosEventos) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-800/60">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filtros.q}
          onChange={(e) => onChange({ ...filtros, q: e.target.value })}
          placeholder="Cuenta o titular…"
          aria-label="Buscar por cuenta o titular"
          className="w-full rounded-lg border border-slate-700 bg-slate-900/60 text-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="Filtrar por prioridad">
        {PRIORIDADES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange({ ...filtros, prioridad: p.value })}
            aria-pressed={filtros.prioridad === p.value}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors min-h-[28px] ${
              filtros.prioridad === p.value
                ? "bg-orange-500/20 text-orange-300 border border-orange-700/60"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filtros.soloPendientes}
          onChange={(e) => onChange({ ...filtros, soloPendientes: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900"
        />
        Solo pendientes
      </label>
    </div>
  );
}

// ── Fila de evento (clickeable, con selección) ────────────────────────────────

function FilaOperador({
  evento,
  flash,
  seleccionado,
  onSelect,
}: {
  evento: EventoLive;
  flash: boolean;
  seleccionado: boolean;
  onSelect: () => void;
}) {
  const p = prioridadStyle(evento.prioridad);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={seleccionado}
        className={`w-full text-left flex items-baseline gap-3 px-3 py-2.5 transition-colors duration-700 ${
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
          className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0 w-[88px]"
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
        </div>
        <EstadoEvento procesado={evento.procesado} />
      </button>
    </li>
  );
}

// ── Panel de contexto del portal ──────────────────────────────────────────────

type EstadoContexto =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "ok"; data: CuentaContextoResponse };

function PanelContexto({ evento, onCerrar }: { evento: EventoLive; onCerrar: () => void }) {
  const [ctx, setCtx] = useState<EstadoContexto>({ tipo: "cargando" });
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
    </section>
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

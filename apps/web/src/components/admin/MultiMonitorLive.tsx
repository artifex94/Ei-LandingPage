"use client";

/**
 * Panel de multimonitoreo del dashboard admin.
 *
 * Replica la grilla en vivo del Multimonitor de SoftGuard con el feed
 * compartido de `eventos-live.ts` (poll 10 s, pausa con pestaña oculta,
 * flash en eventos nuevos) y muestra los últimos eventos recibidos con
 * prioridad por color y estado procesado/pendiente por fila.
 *
 * fuente="live" → grilla real de la central (LED verde, EN VIVO).
 * fuente="db"   → últimos eventos sincronizados por el cron (DIFERIDO).
 *
 * `limit`: cantidad de eventos a mostrar (12 en el dashboard admin; la vista
 * extensa de operadores es /admin/monitoreo → `MonitorOperadores`).
 */

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { EventoLive } from "@/app/api/admin/eventos-live/route";
import {
  useEventosLive,
  hora,
  prioridadStyle,
  vidaUtilEvento,
  type EstadoCentral,
} from "./eventos-live";

export function MultiMonitorLive({ limit = 15 }: { limit?: number }) {
  const { data, estado, reconectando, flashIds, poll } = useEventosLive(limit);

  return (
    <section className="rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/40 p-5">
      <div className="flex items-center justify-between gap-3 pb-3 mb-1 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white tracking-tight">Multimonitoreo</h2>
          <EstadoConexion estado={estado} />
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-[10px] text-slate-600 tabular-nums">
              actualizado {hora(data.at)}
            </span>
          )}
          <button
            type="button"
            onClick={() => void poll({ relogin: true })}
            disabled={reconectando}
            title="Reconectar con la central (login nuevo)"
            className="p-1 -m-1 text-slate-500 hover:text-orange-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconectando ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="sr-only">Reconectar con la central</span>
          </button>
          <Link
            href="/admin/monitoreo"
            className="text-[11px] font-semibold text-slate-500 hover:text-orange-400 transition-colors"
          >
            Vista operadores →
          </Link>
        </div>
      </div>

      {estado === "cargando" && <Skeleton />}

      {estado === "caido" && (
        <p className="text-[11px] text-red-400/80 pt-2 pb-1">
          Sin conexión con la central{data && data.eventos.length > 0 ? " — mostrando lo último sincronizado." : "."}{" "}
          Se reintenta solo; el botón ↻ fuerza un login nuevo.
        </p>
      )}

      {data && data.eventos.length === 0 && estado !== "caido" && (
        <p className="text-xs text-slate-600 py-4">
          {estado === "vivo" ? "Sin eventos recientes en la central." : "Sin eventos sincronizados."}
        </p>
      )}

      {data && data.eventos.length > 0 && (
        <ul className="divide-y divide-slate-800/60">
          {data.eventos.map((e) => (
            <FilaEvento key={e.id} evento={e} flash={flashIds.has(e.id)} refMs={Date.parse(data.at)} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Subcomponentes (los badges también los usa la vista de operadores) ────────

export function EstadoConexion({ estado }: { estado: EstadoCentral }) {
  if (estado === "caido") {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-led-crit" aria-hidden="true" />
        Sin conexión
      </span>
    );
  }
  if (estado === "vivo") {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
        En vivo
      </span>
    );
  }
  if (estado === "diferido") {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" aria-hidden="true" />
        Diferido
      </span>
    );
  }
  return null;
}

/**
 * Barra fina de "vida útil" al fondo de la fila: se descarga (scaleX 1→0) a lo largo de la
 * ventana del evento según su antigüedad. La drena el CSS (`barra-vida` + animation-delay
 * negativo); `refMs` viene del `at` del feed para que el render sea puro. La fila debe ser `relative`.
 */
export function BarraVidaUtil({ evento, refMs }: { evento: EventoLive; refMs: number }) {
  const { windowMs, elapsedMs } = vidaUtilEvento(evento.fecha, refMs, evento.prioridad);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
      <span
        className="block h-full barra-vida"
        style={{
          animationDuration: `${windowMs}ms`,
          animationDelay: `-${elapsedMs}ms`,
          backgroundColor: prioridadStyle(evento.prioridad).borde,
        }}
      />
    </span>
  );
}

export function EstadoEvento({ procesado }: { procesado: boolean }) {
  if (procesado) {
    return (
      <span className="shrink-0 self-center rounded-md border border-slate-700/40 bg-slate-900/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        Procesado
      </span>
    );
  }
  return (
    <span className="shrink-0 self-center flex items-center gap-1.5 rounded-md border border-amber-700/50 bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-led-alert" aria-hidden="true" />
      Pendiente
    </span>
  );
}

function FilaEvento({ evento, flash, refMs }: { evento: EventoLive; flash: boolean; refMs: number }) {
  const p = prioridadStyle(evento.prioridad);
  return (
    <li
      className={`relative flex items-baseline gap-3 px-2 py-2 transition-colors duration-1000 ${
        flash ? "bg-orange-500/10" : "bg-transparent"
      }`}
      style={{ borderLeft: `2px solid ${p.borde}` }}
    >
      <time
        dateTime={evento.fecha}
        className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0"
      >
        {hora(evento.fecha)}
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
      <BarraVidaUtil evento={evento} refMs={refMs} />
    </li>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 py-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-9 rounded bg-slate-800/60 animate-pulse" />
      ))}
    </div>
  );
}

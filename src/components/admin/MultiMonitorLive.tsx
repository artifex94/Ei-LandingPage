"use client";

/**
 * Panel de multimonitoreo del dashboard admin.
 *
 * Replica la grilla en vivo del Multimonitor de SoftGuard: pollea
 * /api/admin/eventos-live cada 10 s (pausado mientras la pestaña no está
 * visible) y muestra los últimos eventos recibidos con prioridad por color
 * y estado procesado/pendiente por fila.
 *
 * fuente="live" → grilla real de la central (LED verde, EN VIVO).
 * fuente="db"   → últimos eventos sincronizados por el cron (DIFERIDO).
 *
 * `limit`: cantidad de eventos a mostrar (12 en el dashboard admin; la vista
 * extensa de operadores reutilizará este componente con un límite mayor).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { EventosLiveResponse, EventoLive } from "@/app/api/admin/eventos-live/route";

const POLL_MS = 10_000;
const FLASH_MS = 4_000;

type Conexion = "cargando" | "ok" | "error";
type EstadoCentral = "cargando" | "vivo" | "diferido" | "caido";

export function MultiMonitorLive({ limit = 15 }: { limit?: number }) {
  const [data, setData] = useState<EventosLiveResponse | null>(null);
  const [conexion, setConexion] = useState<Conexion>("cargando");
  const [reconectando, setReconectando] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const vistosRef = useRef<Set<string> | null>(null);

  const poll = useCallback(async (opts?: { relogin?: boolean }) => {
    if (opts?.relogin) setReconectando(true);
    try {
      const url = `/api/admin/eventos-live?limit=${limit}${opts?.relogin ? "&relogin=1" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as EventosLiveResponse;

      // Resaltar solo lo que entró después de la primera carga.
      if (vistosRef.current) {
        const previos = vistosRef.current;
        const nuevos = json.eventos.filter((e) => !previos.has(e.id)).map((e) => e.id);
        if (nuevos.length > 0) {
          setFlashIds((prev) => new Set([...prev, ...nuevos]));
          setTimeout(() => {
            setFlashIds((prev) => {
              const next = new Set(prev);
              for (const id of nuevos) next.delete(id);
              return next;
            });
          }, FLASH_MS);
        }
      }
      vistosRef.current = new Set(json.eventos.map((e) => e.id));

      setData(json);
      setConexion("ok");
    } catch {
      setConexion("error");
    } finally {
      setReconectando(false);
    }
  }, [limit]);

  useEffect(() => {
    void poll();
    const interval = setInterval(() => {
      if (!document.hidden) void poll();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  const estado: EstadoCentral =
    conexion === "cargando" ? "cargando"
    : conexion === "error" || data?.degradado ? "caido"
    : data?.fuente === "live" ? "vivo"
    : "diferido";

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
            href="/admin/eventos"
            className="text-[11px] font-semibold text-slate-500 hover:text-orange-400 transition-colors"
          >
            Ver todos →
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
            <FilaEvento key={e.id} evento={e} flash={flashIds.has(e.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function EstadoConexion({ estado }: { estado: EstadoCentral }) {
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

function FilaEvento({ evento, flash }: { evento: EventoLive; flash: boolean }) {
  const p = prioridadStyle(evento.prioridad);
  return (
    <li
      className={`flex items-baseline gap-3 px-2 py-2 transition-colors duration-1000 ${
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
    </li>
  );
}

function EstadoEvento({ procesado }: { procesado: boolean }) {
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

function Skeleton() {
  return (
    <div className="space-y-2 py-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-9 rounded bg-slate-800/60 animate-pulse" />
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Prioridad SoftGuard: 1 = crítica. Sin prioridad → neutro. */
function prioridadStyle(p: number | null): { borde: string; badge: string; texto: string } {
  if (p === 1) {
    return {
      borde: "rgba(239,68,68,0.6)",
      badge: "border-red-700/60 bg-red-950/50 text-red-300",
      texto: "text-red-200",
    };
  }
  if (p === 2) {
    return {
      borde: "rgba(245,158,11,0.5)",
      badge: "border-amber-700/50 bg-amber-950/40 text-amber-300",
      texto: "text-amber-100",
    };
  }
  return {
    borde: "rgba(51,65,85,0.5)",
    badge: "border-slate-700/50 bg-slate-900/60 text-slate-400",
    texto: "text-slate-200",
  };
}

"use client";

/**
 * Lógica compartida del feed de eventos en vivo de la central.
 *
 * La usan el panel compacto del dashboard (`MultiMonitorLive`) y la vista
 * extensa de operadores (`MonitorOperadores`): un solo polling, un solo
 * criterio de prioridad y un solo filtro client-side para ambas pantallas.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventosLiveResponse, EventoLive } from "@/app/api/admin/eventos-live/route";

export const POLL_MS = 10_000;
const FLASH_MS = 4_000;

type Conexion = "cargando" | "ok" | "error";
export type EstadoCentral = "cargando" | "vivo" | "diferido" | "caido";

/**
 * Pollea /api/admin/eventos-live cada 10 s (pausado con la pestaña oculta),
 * marca con flash los eventos que entran después de la primera carga y expone
 * la reconexión manual (login fresco contra la central).
 */
export function useEventosLive(limit: number) {
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

  return { data, estado, reconectando, flashIds, poll };
}

// ── Helpers de presentación ───────────────────────────────────────────────────

// Formato fijo 24 h (HH:mm:ss), sin locale: toLocaleTimeString("es-AR") cambia
// según el ICU del runtime (12 h en algunos Node) y una consola de monitoreo
// necesita SIEMPRE el mismo formato.
const p2 = (n: number) => String(n).padStart(2, "0");

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/** Hora para listas largas: si el evento no es de hoy, antepone dd/mm. */
export function horaConDia(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const esHoy =
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear();
  if (esHoy) return hora(iso);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${hora(iso)}`;
}

/** Prioridad SoftGuard: 1 = crítica. Sin prioridad → neutro. */
export function prioridadStyle(p: number | null): { borde: string; badge: string; texto: string } {
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

// ── Filtros client-side de la vista de operadores ─────────────────────────────

export interface FiltrosEventos {
  /** Búsqueda por número de cuenta (softguard_ref) o titular. */
  q: string;
  prioridad: "todas" | "1" | "2" | "otras";
  soloPendientes: boolean;
}

export const FILTROS_INICIALES: FiltrosEventos = {
  q: "",
  prioridad: "todas",
  soloPendientes: false,
};

export function filtrarEventos(eventos: EventoLive[], f: FiltrosEventos): EventoLive[] {
  const q = f.q.trim().toLowerCase();
  return eventos.filter((e) => {
    if (f.soloPendientes && e.procesado) return false;
    if (f.prioridad === "1" && e.prioridad !== 1) return false;
    if (f.prioridad === "2" && e.prioridad !== 2) return false;
    if (f.prioridad === "otras" && (e.prioridad === 1 || e.prioridad === 2)) return false;
    if (q) {
      const ref = e.softguard_ref.toLowerCase();
      const titular = e.titular.toLowerCase();
      if (!ref.includes(q) && !titular.includes(q)) return false;
    }
    return true;
  });
}

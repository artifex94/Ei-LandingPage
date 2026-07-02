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
import { horaAR, diaMesAR, esHoyAR } from "@/lib/fecha-ar";
import { etiquetaCuenta } from "@/lib/whatsapp";

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

// Formato fijo 24 h en hora de Argentina, determinístico (no depende del
// timezone del browser del operador ni del ICU del runtime): una consola de
// monitoreo necesita SIEMPRE la misma hora local, sea quien sea que la mire.
export function hora(iso: string): string {
  return horaAR(iso);
}

/** Hora para listas largas: si el evento no es de hoy, antepone dd/mm. */
export function horaConDia(iso: string): string {
  if (esHoyAR(iso)) return horaAR(iso);
  return `${diaMesAR(iso)} ${horaAR(iso)}`;
}

/**
 * Etiqueta de cuenta para mostrar en la UI ("Casa (Rawson 255)"), SOLO cuando el titular
 * tiene 2+ cuentas activas (si no, "" — el operador no necesita la aclaración). Reusa
 * `etiquetaCuenta` de wa.me quitando la negrita `*` que en pantalla no aplica.
 */
export function etiquetaCuentaUi(e: EventoLive): string {
  if (!e.titularMultiCuenta) return "";
  return etiquetaCuenta(
    {
      descripcion: e.cuentaDescripcion,
      calle: e.cuentaCalle,
      softguardRef: e.softguard_ref,
    },
    "plano",
  );
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

// ── Columnas del board de monitoreo en vivo ───────────────────────────────────

export type ColumnaKey = "todos" | "p1" | "p2" | "resto";

export interface ColumnaMonitoreo {
  key: ColumnaKey;
  label: string;
  /** Filtro de prioridad que define la columna (reutiliza `filtrarEventos`). */
  prioridad: FiltrosEventos["prioridad"];
  /** Color de acento del header de la columna (Tailwind). */
  acento: string;
}

/**
 * Las cuatro columnas del board: Todos · P1 crítica · P2 · Resto. El orden es también
 * el de las pestañas en mobile; la pestaña inicial (P1) la fija el componente.
 */
export const COLUMNAS_MONITOREO: ColumnaMonitoreo[] = [
  { key: "todos", label: "Todos", prioridad: "todas", acento: "text-slate-300" },
  { key: "p1", label: "P1 crítica", prioridad: "1", acento: "text-red-300" },
  { key: "p2", label: "P2", prioridad: "2", acento: "text-amber-300" },
  { key: "resto", label: "Resto", prioridad: "otras", acento: "text-slate-400" },
];

// ── Vida útil de un evento (barra que se descarga) ────────────────────────────
//
// SoftGuard no expone un deadline por evento; la "vida útil" es una convención del
// portal por prioridad: cuánto tarda la barra inferior de la fila en vaciarse. Es solo
// una noción visual de "hace cuánto se activó y sigue sin procesar" — ajustable acá.

const MIN = 60 * 1000;

/** Ventana de vida útil por prioridad (P1 más corta = más urgente). */
export const VENTANA_VIDA_UTIL_MS = { p1: 5 * MIN, p2: 15 * MIN, resto: 30 * MIN } as const;

function ventanaVidaUtil(prioridad: number | null): number {
  if (prioridad === 1) return VENTANA_VIDA_UTIL_MS.p1;
  if (prioridad === 2) return VENTANA_VIDA_UTIL_MS.p2;
  return VENTANA_VIDA_UTIL_MS.resto;
}

/**
 * Datos para la barra de vida útil: ventana total y tiempo transcurrido (≥ 0) respecto a
 * `refMs` (el `at` del feed, NO `Date.now()` — así el render es puro). El componente arma
 * la animación CSS con estos dos valores; el vaciado lo dibuja el navegador.
 */
export function vidaUtilEvento(
  fechaISO: string,
  refMs: number,
  prioridad: number | null,
): { windowMs: number; elapsedMs: number } {
  const fechaMs = new Date(fechaISO).getTime();
  const elapsedMs = Number.isNaN(fechaMs) ? 0 : Math.max(0, refMs - fechaMs);
  return { windowMs: ventanaVidaUtil(prioridad), elapsedMs };
}

// ── Agrupación de eventos de una misma cuenta ─────────────────────────────────

/** Ventana para considerar que varios eventos de una cuenta son "el mismo aviso". */
export const VENTANA_AGRUPACION_MS = 10 * 60 * 1000;

/**
 * Eventos de la misma cuenta que `base`, disparados dentro de ±ventana (incluye al
 * propio `base`), ordenados del más viejo al más nuevo. Para notificar varias zonas en
 * un solo mensaje. Agrupa por `softguard_ref` (estable; `iid_cuenta` es 0 en fallback DB).
 */
export function eventosAgrupadosCuenta(
  eventos: EventoLive[],
  base: EventoLive,
  ventanaMs: number = VENTANA_AGRUPACION_MS,
): EventoLive[] {
  const t0 = new Date(base.fecha).getTime();
  return eventos
    .filter(
      (e) =>
        e.softguard_ref === base.softguard_ref &&
        Math.abs(new Date(e.fecha).getTime() - t0) <= ventanaMs,
    )
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

// ── Agrupación de eventos REPETIDOS (mismo aviso, varias veces) ──────────────
//
// Distinto de `eventosAgrupadosCuenta` (que junta zonas distintas de una misma
// cuenta para un solo mensaje de WhatsApp): esto colapsa, SOLO para el render
// del board, disparos consecutivos de la MISMA cuenta + zona + código dentro de
// la ventana en una única fila con contador — el típico "se movió el sensor y
// mandó 5 veces la misma alarma en 3 minutos". No cambia el feed que consumen
// el resto de pantallas (`MultiMonitorLive`, el modal de WhatsApp): se aplica
// en el cliente, justo antes de pintar cada columna del board de operadores.

export interface EventoAgrupado extends EventoLive {
  /** Cantidad de eventos colapsados en esta fila (1 = no se agrupó con nada). */
  repeticiones: number;
  /** Fecha (ISO) de cada evento del grupo, de más viejo a más nuevo (incluye el representante). */
  fechasAgrupadas: string[];
}

/**
 * Colapsa eventos consecutivos de la misma cuenta (`softguard_ref`) + `zona` +
 * `codigo`, disparados dentro de `ventanaMs` uno del otro, en un solo item por
 * grupo: se queda con los campos del más reciente y suma `repeticiones`. No
 * asume el orden del input (lo ordena internamente por fecha descendente) —
 * función pura, sin dependencia del reloj real.
 */
export function agruparEventosRepetidos(
  eventos: EventoLive[],
  ventanaMs: number = VENTANA_AGRUPACION_MS,
): EventoAgrupado[] {
  const ordenados = [...eventos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const out: EventoAgrupado[] = [];
  for (const e of ordenados) {
    const grupo = out[out.length - 1];
    const mismoAviso =
      grupo &&
      grupo.softguard_ref === e.softguard_ref &&
      grupo.zona === e.zona &&
      grupo.codigo === e.codigo &&
      new Date(grupo.fecha).getTime() - new Date(e.fecha).getTime() <= ventanaMs;

    if (mismoAviso) {
      grupo.repeticiones += 1;
      grupo.fechasAgrupadas.unshift(e.fecha); // e es más viejo que lo ya acumulado → va adelante
      continue;
    }
    out.push({ ...e, repeticiones: 1, fechasAgrupadas: [e.fecha] });
  }
  return out;
}

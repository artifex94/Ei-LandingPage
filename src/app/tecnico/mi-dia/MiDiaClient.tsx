"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { guardarDisponibilidad } from "@/lib/actions/disponibilidad";
import {
  rangosASlots, slotsARangos, slotAHora, horaASlot, TOTAL_SLOTS,
} from "@/lib/disponibilidad-utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Rango { desde: string; hasta: string }

interface Tarea {
  id: string;
  titulo: string;
  hora_inicio: string | null;
  hora_fin:    string | null;
  prioridad:   string;
  estado:      string;
  cuenta_calle: string | null;
  cuenta_localidad: string | null;
}

interface Props {
  fechaISO: string;
  fechaLabel: string;
  tareas: Tarea[];
  rangosIniciales: Rango[];
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const SLOT_MIN_INICIO = 0;   // 06:00

const PRIORIDAD_COLOR: Record<string, string> = {
  ALTA:  "border-l-red-500   bg-red-500/10",
  MEDIA: "border-l-amber-500 bg-amber-500/10",
  BAJA:  "border-l-slate-500 bg-slate-500/10",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:  "Pendiente",
  EN_CURSO:   "En curso",
  COMPLETADA: "Completada",
};

// ── Lógica de toggle de slot ───────────────────────────────────────────────────

function toggleSlot(slots: boolean[], idx: number): boolean[] {
  const next = [...slots];
  next[idx] = !next[idx];
  return next;
}

// ── Componente principal ───────────────────────────────────────────────────────

export function MiDiaClient({ fechaISO, fechaLabel, tareas, rangosIniciales }: Props) {
  const [slots, setSlots] = useState<boolean[]>(() => rangosASlots(rangosIniciales));
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [, startTransition] = useTransition();

  const manejarToggle = useCallback((idx: number) => {
    const nuevosSlots = toggleSlot(slots, idx);
    setSlots(nuevosSlots);
    setGuardado(false);

    // Auto-guardar con debounce visual
    setGuardando(true);
    startTransition(async () => {
      const rangos = slotsARangos(nuevosSlots);
      await guardarDisponibilidad(fechaISO, rangos);
      setGuardando(false);
      setGuardado(true);
    });
  }, [slots, fechaISO]);

  // Agrupar tareas por posición en timeline
  const tareasConSlot = tareas.map((t) => ({
    ...t,
    slotInicio: t.hora_inicio ? Math.max(0, horaASlot(t.hora_inicio)) : null,
    slotFin:    t.hora_fin    ? Math.max(1, horaASlot(t.hora_fin))    : null,
  }));

  const tareasConHora    = tareasConSlot.filter((t) => t.slotInicio !== null);
  const tareasSinHora    = tareasConSlot.filter((t) => t.slotInicio === null);

  // Resumen de disponibilidad
  const totalSlots = slots.filter(Boolean).length;
  const horasDisponibles = totalSlots / 2;

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white capitalize">{fechaLabel}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {tareas.length === 0
              ? "Sin tareas asignadas"
              : `${tareas.length} tarea${tareas.length !== 1 ? "s" : ""} asignada${tareas.length !== 1 ? "s" : ""}`}
            {" · "}
            <span className={horasDisponibles > 0 ? "text-emerald-400" : "text-slate-500"}>
              {horasDisponibles}h disponibles
            </span>
          </p>
        </div>
        <div className="text-right text-xs">
          {guardando && <span className="text-slate-500">Guardando…</span>}
          {guardado  && !guardando && <span className="text-emerald-400">✓ Guardado</span>}
        </div>
      </div>

      {/* ── Tareas sin hora ─────────────────────────────────────────────────── */}
      {tareasSinHora.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sin horario asignado</p>
          {tareasSinHora.map((t) => (
            <TareaCard key={t.id} tarea={t} />
          ))}
        </div>
      )}

      {/* ── Timeline ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Disponibilidad y tareas
          </p>
          <button
            onClick={() => {
              const todosActivos = slots.every(Boolean);
              const nuevosSlots = new Array<boolean>(TOTAL_SLOTS).fill(!todosActivos);
              setSlots(nuevosSlots);
              setGuardando(true);
              setGuardado(false);
              startTransition(async () => {
                await guardarDisponibilidad(fechaISO, slotsARangos(nuevosSlots));
                setGuardando(false);
                setGuardado(true);
              });
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {slots.every(Boolean) ? "Limpiar todo" : "Marcar todo"}
          </button>
        </div>

        <div className="relative rounded-xl border border-slate-700 overflow-hidden bg-slate-900">
          {Array.from({ length: TOTAL_SLOTS }, (_, idx) => {
            const esHora = (SLOT_MIN_INICIO + idx) % 2 === 0;
            const horaLabel = slotAHora(idx);
            const disponible = slots[idx];
            const tareasEnSlot = tareasConHora.filter(
              (t) => t.slotInicio !== null && t.slotInicio <= idx && (t.slotFin === null || t.slotFin > idx)
            );
            const esInicioTarea = tareasConHora.filter((t) => t.slotInicio === idx);

            return (
              <div
                key={idx}
                className={`
                  flex items-start group relative
                  ${disponible ? "bg-emerald-950/20" : "bg-slate-900"}
                  ${esHora ? "border-t border-slate-700/50" : "border-t border-slate-800/30"}
                `}
                style={{ minHeight: "32px" }}
              >
                {/* Etiqueta de hora */}
                <button
                  onClick={() => manejarToggle(idx)}
                  className="w-14 flex-shrink-0 px-2 py-1 text-right select-none focus:outline-none"
                  aria-label={`${disponible ? "Desmarcar" : "Marcar"} disponibilidad ${horaLabel}`}
                >
                  <span className={`text-[10px] leading-none font-mono ${esHora ? "text-slate-400" : "text-transparent"}`}>
                    {esHora ? horaLabel : ""}
                  </span>
                </button>

                {/* Bloque de disponibilidad (clickeable) */}
                <button
                  onClick={() => manejarToggle(idx)}
                  className={`
                    flex-1 h-8 mx-1 my-0.5 rounded cursor-pointer
                    transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-emerald-500
                    ${disponible
                      ? "bg-emerald-500/20 hover:bg-emerald-500/30 group-hover:bg-emerald-500/30"
                      : "bg-slate-800/40 hover:bg-slate-700/40"
                    }
                  `}
                  aria-pressed={disponible}
                  title={`${horaLabel}–${slotAHora(idx + 1)} — ${disponible ? "disponible (clic para marcar no disponible)" : "no disponible (clic para marcar disponible)"}`}
                />

                {/* Tarjetas de tareas que empiezan en este slot */}
                {esInicioTarea.length > 0 && (
                  <div className="absolute left-16 right-0 z-10 px-1 space-y-0.5 py-0.5">
                    {esInicioTarea.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tecnico/tareas/${t.id}`}
                        className={`block rounded border-l-2 px-2 py-1 text-xs font-medium text-white truncate ${PRIORIDAD_COLOR[t.prioridad] ?? "border-l-slate-500 bg-slate-700/60"}`}
                        style={{
                          height: t.slotFin !== null && t.slotInicio !== null
                            ? `${(t.slotFin - t.slotInicio) * 33}px`
                            : "30px",
                          overflow: "hidden",
                        }}
                      >
                        <span className="font-bold text-[10px] mr-1 opacity-70">
                          {t.hora_inicio}
                        </span>
                        {t.titulo}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Indicador derecho de tarea en curso */}
                {tareasEnSlot.length > 0 && esInicioTarea.length === 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-amber-400/40" />
                )}
              </div>
            );
          })}

          {/* Línea de fin */}
          <div className="flex items-center border-t border-slate-700/50">
            <span className="w-14 px-2 py-1 text-right text-[10px] font-mono text-slate-400">22:00</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 mt-2 text-center">
          Tocá un bloque para marcar / desmarcar tu disponibilidad
        </p>
      </div>

      {/* ── Lista completa de tareas del día ────────────────────────────────── */}
      {tareasConHora.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tareas del día</p>
          {tareasConHora
            .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""))
            .map((t) => (
              <TareaCard key={t.id} tarea={t} />
            ))}
        </div>
      )}

      {tareas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
          <p className="text-slate-500 text-sm">No tenés tareas asignadas para hoy.</p>
        </div>
      )}
    </div>
  );
}

// ── TareaCard ─────────────────────────────────────────────────────────────────

function TareaCard({ tarea }: { tarea: Tarea }) {
  return (
    <Link
      href={`/tecnico/tareas/${tarea.id}`}
      className={`
        block rounded-lg border border-slate-700 border-l-4 px-3 py-2.5
        hover:bg-slate-800 transition-colors
        ${PRIORIDAD_COLOR[tarea.prioridad] ?? "border-l-slate-500"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {tarea.hora_inicio && (
              <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
                {tarea.hora_inicio}
                {tarea.hora_fin && `–${tarea.hora_fin}`}
              </span>
            )}
            <span className="text-sm font-semibold text-white truncate">{tarea.titulo}</span>
          </div>
          {(tarea.cuenta_calle || tarea.cuenta_localidad) && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {[tarea.cuenta_calle, tarea.cuenta_localidad].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
          tarea.estado === "COMPLETADA" ? "bg-emerald-500/20 text-emerald-400" :
          tarea.estado === "EN_CURSO"   ? "bg-sky-500/20 text-sky-400" :
          "bg-slate-700 text-slate-400"
        }`}>
          {ESTADO_LABEL[tarea.estado] ?? tarea.estado}
        </span>
      </div>
    </Link>
  );
}

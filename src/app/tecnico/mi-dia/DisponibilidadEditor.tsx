"use client";

import { useState, useTransition, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { guardarDisponibilidad } from "@/lib/actions/disponibilidad";
import {
  rangosASlots, slotsARangos, slotAHora, TOTAL_SLOTS,
} from "@/lib/disponibilidad-utils";

interface Rango { desde: string; hasta: string }

interface Props {
  fechaISO: string;
  rangosIniciales: Rango[];
}

const SLOT_MIN_INICIO = 0; // 06:00

function toggleSlot(slots: boolean[], idx: number): boolean[] {
  const next = [...slots];
  next[idx] = !next[idx];
  return next;
}

/**
 * Editor de disponibilidad del día: resumen de una línea, colapsado por
 * defecto; al expandir muestra el timeline de slots de 30 min con
 * auto-guardado optimista (useTransition + setState).
 */
export function DisponibilidadEditor({ fechaISO, rangosIniciales }: Props) {
  const [slots, setSlots] = useState<boolean[]>(() => rangosASlots(rangosIniciales));
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const guardar = useCallback((nuevosSlots: boolean[]) => {
    setGuardando(true);
    setGuardado(false);
    setErrorGuardado(null);
    startTransition(async () => {
      const res = await guardarDisponibilidad(fechaISO, slotsARangos(nuevosSlots));
      setGuardando(false);
      if (res.ok) {
        setGuardado(true);
      } else {
        setErrorGuardado(res.error ?? "No se pudo guardar.");
      }
    });
  }, [fechaISO]);

  const manejarToggle = useCallback((idx: number) => {
    const nuevosSlots = toggleSlot(slots, idx);
    setSlots(nuevosSlots);
    guardar(nuevosSlots);
  }, [slots, guardar]);

  const totalSlots = slots.filter(Boolean).length;
  const horasDisponibles = totalSlots / 2;

  // Rango legible del resumen (primer y último slot disponibles)
  const primerIdx = slots.indexOf(true);
  const ultimoIdx = slots.lastIndexOf(true);
  const resumenRango =
    primerIdx === -1
      ? "Sin disponibilidad cargada"
      : `Disponible ${slotAHora(primerIdx)}–${slotAHora(ultimoIdx + 1)}`;

  return (
    <section
      aria-labelledby="disponibilidad-heading"
      className="rounded-lg border border-industrial-700 bg-industrial-800/60"
    >
      {/* ── Resumen colapsable ── */}
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls="disponibilidad-editor"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[52px] hover:bg-industrial-800 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${horasDisponibles > 0 ? "bg-emerald-400" : "bg-slate-600"}`}
            aria-hidden="true"
          />
          <h2
            id="disponibilidad-heading"
            className="text-xs font-bold uppercase tracking-widest text-slate-400 truncate"
          >
            Mi disponibilidad
          </h2>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {resumenRango} · {horasDisponibles}h
          </span>
          {guardando && <span className="text-xs text-slate-500">Guardando…</span>}
          {guardado && !guardando && <span className="text-xs text-emerald-400">✓</span>}
          {errorGuardado && !guardando && (
            <span role="alert" className="text-xs text-red-400">⚠ {errorGuardado}</span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* ── Editor expandido ── */}
      {abierto && (
        <div id="disponibilidad-editor" className="px-4 pb-4">
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={() => {
                const todosActivos = slots.every(Boolean);
                const nuevosSlots = new Array<boolean>(TOTAL_SLOTS).fill(!todosActivos);
                setSlots(nuevosSlots);
                guardar(nuevosSlots);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors min-h-[44px]"
            >
              {slots.every(Boolean) ? "Limpiar todo" : "Marcar todo"}
            </button>
          </div>

          <div className="relative rounded-md border border-industrial-700 overflow-hidden bg-industrial-900">
            {Array.from({ length: TOTAL_SLOTS }, (_, idx) => {
              const esHora = (SLOT_MIN_INICIO + idx) % 2 === 0;
              const horaLabel = slotAHora(idx);
              const disponible = slots[idx];

              return (
                <div
                  key={idx}
                  className={`
                    flex items-start group relative
                    ${disponible ? "bg-emerald-950/20" : "bg-industrial-900"}
                    ${esHora ? "border-t border-industrial-700/50" : "border-t border-industrial-800/30"}
                  `}
                  style={{ minHeight: "32px" }}
                >
                  {/* Etiqueta de hora */}
                  <button
                    onClick={() => manejarToggle(idx)}
                    className="w-14 flex-shrink-0 px-2 py-1 text-right select-none focus:outline-none"
                    aria-label={`${disponible ? "Desmarcar" : "Marcar"} disponibilidad ${horaLabel}`}
                  >
                    <span className={`text-xs leading-none font-mono ${esHora ? "text-slate-400" : "text-transparent"}`}>
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
                        : "bg-industrial-800/40 hover:bg-industrial-700/40"
                      }
                    `}
                    aria-pressed={disponible}
                    title={`${horaLabel}–${slotAHora(idx + 1)} — ${disponible ? "disponible (clic para marcar no disponible)" : "no disponible (clic para marcar disponible)"}`}
                  />
                </div>
              );
            })}

            {/* Línea de fin */}
            <div className="flex items-center border-t border-industrial-700/50">
              <span className="w-14 px-2 py-1 text-right text-xs font-mono text-slate-400">22:00</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-2 text-center">
            Tocá un bloque para marcar / desmarcar tu disponibilidad
          </p>
        </div>
      )}
    </section>
  );
}

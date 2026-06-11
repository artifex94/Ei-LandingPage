"use client";

import { useState, useTransition, useCallback } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { guardarDisponibilidad } from "@/lib/actions/disponibilidad";
import {
  PRESETS,
  disponibilidadDefault,
  normalizarRangos,
  presetActivo,
  rangosAHoras,
  rangosAResumen,
  type Rango,
} from "@/lib/disponibilidad-utils";
import { BarraDisponibilidad } from "./BarraDisponibilidad";

export interface DiaStrip {
  iso: string;   // "yyyy-MM-dd"
  dia: string;   // "lun"
  num: string;   // "12"
  esHoy: boolean;
}

interface Props {
  dias: DiaStrip[];
  dispPorFecha: Record<string, Rango[]>;
  /** Día a abrir de entrada (viene de ?fecha=); si está, el editor arranca expandido. */
  fechaInicial?: string;
}

const inputTimeCls =
  "bg-industrial-800 border border-industrial-700 rounded-md px-2.5 py-2 text-sm font-mono " +
  "text-white min-h-[44px] focus:outline-none focus:border-tactical-500 " +
  "focus:ring-2 focus:ring-tactical-500/20 transition-colors";

/**
 * Editor híbrido de disponibilidad: presets de un tap + franjas Desde–Hasta
 * con la rueda de hora nativa + barra visual de solo lectura. Permite editar
 * hoy o cualquier día de las próximas dos semanas, con autosave.
 */
export function DisponibilidadEditor({ dias, dispPorFecha, fechaInicial }: Props) {
  const fechaValida = fechaInicial && dias.some((d) => d.iso === fechaInicial);

  const [disp, setDisp] = useState<Record<string, Rango[]>>(dispPorFecha);
  const [fechaSel, setFechaSel] = useState<string>(
    fechaValida ? fechaInicial! : dias[0]?.iso ?? ""
  );
  const [abierto, setAbierto] = useState(Boolean(fechaValida));
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const rangosDia = disp[fechaSel] ?? disponibilidadDefault();
  const diaSel = dias.find((d) => d.iso === fechaSel);
  const preset = presetActivo(rangosDia);

  const guardar = useCallback((fecha: string, rangos: Rango[]) => {
    const norm = normalizarRangos(rangos);
    setDisp((prev) => ({ ...prev, [fecha]: norm }));
    setGuardando(true);
    setGuardado(false);
    setErrorGuardado(null);
    startTransition(async () => {
      const res = await guardarDisponibilidad(fecha, norm);
      setGuardando(false);
      if (res.ok) {
        setGuardado(true);
      } else {
        setErrorGuardado(res.error ?? "No se pudo guardar.");
      }
    });
  }, []);

  function seleccionarDia(iso: string) {
    setFechaSel(iso);
    setGuardado(false);
    setErrorGuardado(null);
  }

  function aplicarPreset(rangos: Rango[]) {
    guardar(fechaSel, rangos);
  }

  // onChange actualiza el borrador sin guardar; onBlur normaliza y persiste
  function cambiarFranja(idx: number, campo: "desde" | "hasta", valor: string) {
    setDisp((prev) => {
      const rangos = [...(prev[fechaSel] ?? disponibilidadDefault())];
      rangos[idx] = { ...rangos[idx], [campo]: valor };
      return { ...prev, [fechaSel]: rangos };
    });
  }

  function confirmarFranjas() {
    guardar(fechaSel, disp[fechaSel] ?? disponibilidadDefault());
  }

  function agregarFranja() {
    guardar(fechaSel, [...rangosDia, { desde: "08:00", hasta: "12:00" }]);
  }

  function eliminarFranja(idx: number) {
    guardar(fechaSel, rangosDia.filter((_, i) => i !== idx));
  }

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
            className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${rangosAHoras(rangosDia) > 0 ? "bg-emerald-400" : "bg-slate-600"}`}
            aria-hidden="true"
          />
          <h2
            id="disponibilidad-heading"
            className="text-xs font-bold uppercase tracking-widest text-slate-400 truncate"
          >
            Disponibilidad{diaSel && !diaSel.esHoy ? ` · ${diaSel.dia} ${diaSel.num}` : ""}
          </h2>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
          <span className="text-xs text-slate-400 font-mono tabular-nums truncate">
            {rangosAResumen(rangosDia)}
          </span>
          {guardando && <span className="text-xs text-slate-500">Guardando…</span>}
          {guardado && !guardando && <span className="text-xs text-emerald-400">✓</span>}
          {errorGuardado && !guardando && (
            <span role="alert" className="text-xs text-red-400">⚠</span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* ── Editor expandido ── */}
      {abierto && (
        <div id="disponibilidad-editor" className="px-4 pb-4 space-y-4">

          {/* Strip de días */}
          <div
            className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
            role="tablist"
            aria-label="Elegir día a configurar"
          >
            {dias.map((d) => {
              const activo = d.iso === fechaSel;
              return (
                <button
                  key={d.iso}
                  role="tab"
                  aria-selected={activo}
                  onClick={() => seleccionarDia(d.iso)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 rounded-sm border transition-colors ${
                    activo
                      ? "bg-tactical-500/15 border-tactical-500/40 text-tactical-300"
                      : "bg-industrial-800 border-industrial-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                    {d.esHoy ? "HOY" : d.dia}
                  </span>
                  <span className="text-sm font-mono font-bold tabular-nums leading-tight">
                    {d.num}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Presets de un tap */}
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const activo = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => aplicarPreset(p.rangos)}
                  aria-pressed={activo}
                  className={`min-h-[44px] px-3 rounded-sm border text-xs font-bold uppercase tracking-widest
                              transition-all duration-150 ease-mech-press
                              ${activo
                                ? "bg-tactical-500/15 border-tactical-500/40 text-tactical-300"
                                : "bg-industrial-800 border-industrial-700 border-b-[3px] border-b-industrial-950 active:border-b active:translate-y-[2px] text-slate-300 hover:text-white"
                              }`}
                >
                  {activo && <span aria-hidden="true" className="mr-1">✓</span>}
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Franjas personalizadas */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Franjas personalizadas
            </p>
            {rangosDia.length === 0 && (
              <p className="text-xs text-slate-500 italic">
                Sin franjas — el día está marcado como no disponible.
              </p>
            )}
            {rangosDia.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="time"
                  min="06:00"
                  max="22:00"
                  step={1800}
                  value={r.desde}
                  onChange={(e) => cambiarFranja(idx, "desde", e.target.value)}
                  onBlur={confirmarFranjas}
                  aria-label={`Franja ${idx + 1}: desde`}
                  className={inputTimeCls}
                />
                <span className="text-slate-500 text-sm" aria-hidden="true">–</span>
                <input
                  type="time"
                  min="06:00"
                  max="22:00"
                  step={1800}
                  value={r.hasta}
                  onChange={(e) => cambiarFranja(idx, "hasta", e.target.value)}
                  onBlur={confirmarFranjas}
                  aria-label={`Franja ${idx + 1}: hasta`}
                  className={inputTimeCls}
                />
                <button
                  onClick={() => eliminarFranja(idx)}
                  aria-label={`Eliminar franja ${r.desde}–${r.hasta}`}
                  className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center rounded-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              onClick={agregarFranja}
              className="flex items-center gap-1.5 min-h-[44px] text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Agregar franja
            </button>
          </div>

          {/* Barra visual de lo configurado */}
          <div className="pt-1">
            <BarraDisponibilidad rangos={rangosDia} />
            <p className="text-xs text-slate-500 mt-2 text-center font-mono tabular-nums">
              {rangosAHoras(rangosDia)}h disponibles
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

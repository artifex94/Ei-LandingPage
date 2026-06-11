"use client";

import { useState, useTransition, useCallback } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { guardarDisponibilidad } from "@/lib/actions/disponibilidad";
import {
  PRESETS,
  disponibilidadDefault,
  horaASlot,
  jornadaARangos,
  normalizarRangos,
  presetActivo,
  rangosAHoras,
  rangosAJornada,
  rangosAResumen,
  sumarMedia,
  type Jornada,
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

/**
 * Editor de disponibilidad con el modelo de jornada laboral: "entro a las X,
 * salgo a las Y", con corte opcional al mediodía. Presets de un tap para los
 * casos comunes, steppers de 30 min para el ajuste fino y barra visual de
 * solo lectura como feedback. Permite editar hoy o cualquier día de las
 * próximas dos semanas, con autosave.
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
  const jornada = rangosAJornada(rangosDia);
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

  function guardarJornada(j: Jornada | null) {
    guardar(fechaSel, jornadaARangos(j));
  }

  // ── Movimientos de la jornada (pasos de 30 min, límites garantizados) ──

  function moverEntro(pasos: number) {
    if (!jornada) return;
    const tope = jornada.corte ? jornada.corte.desde : jornada.salgo;
    const nuevo = sumarMedia(jornada.entro, pasos);
    if (nuevo >= tope) return;
    guardarJornada({ ...jornada, entro: nuevo });
  }

  function moverSalgo(pasos: number) {
    if (!jornada) return;
    const piso = jornada.corte ? jornada.corte.hasta : jornada.entro;
    const nuevo = sumarMedia(jornada.salgo, pasos);
    if (nuevo <= piso) return;
    guardarJornada({ ...jornada, salgo: nuevo });
  }

  function moverCorte(campo: "desde" | "hasta", pasos: number) {
    if (!jornada?.corte) return;
    const corte = { ...jornada.corte, [campo]: sumarMedia(jornada.corte[campo], pasos) };
    const valido =
      corte.desde > jornada.entro &&
      corte.hasta < jornada.salgo &&
      corte.desde < corte.hasta;
    if (!valido) return;
    guardarJornada({ ...jornada, corte });
  }

  // La jornada admite corte si hay lugar para 30 min de descanso con al
  // menos 30 min de trabajo a cada lado (1h30 en total).
  const admiteCorte =
    jornada !== null && horaASlot(jornada.salgo) - horaASlot(jornada.entro) >= 3;

  function toggleCorte() {
    if (!jornada) return;
    if (jornada.corte) {
      guardarJornada({ ...jornada, corte: null });
      return;
    }
    if (!admiteCorte) return;
    // Corte sugerido: 12:00–13:00, corrido dentro de la jornada si no entra
    let desde = sumarMedia("12:00", 0);
    if (desde <= jornada.entro) desde = sumarMedia(jornada.entro, 1);
    let hasta = sumarMedia(desde, 2);
    if (hasta >= jornada.salgo) {
      hasta = sumarMedia(jornada.salgo, -1);
      desde = sumarMedia(hasta, -2);
      if (desde <= jornada.entro) desde = sumarMedia(jornada.entro, 1);
    }
    guardarJornada({ ...jornada, corte: { desde, hasta } });
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

          {jornada === null ? (
            <p className="text-xs text-slate-500 italic text-center py-2">
              Día marcado como no disponible — elegí un preset para reactivarlo.
            </p>
          ) : (
            <>
              {/* Jornada: entro / salgo */}
              <div className="space-y-3">
                <HoraStepper
                  label="Entro a las"
                  valor={jornada.entro}
                  onCambio={moverEntro}
                  puedeMenos={jornada.entro > "06:00"}
                  puedeMas={sumarMedia(jornada.entro, 1) < (jornada.corte?.desde ?? jornada.salgo)}
                />
                <HoraStepper
                  label="Salgo a las"
                  valor={jornada.salgo}
                  onCambio={moverSalgo}
                  puedeMenos={sumarMedia(jornada.salgo, -1) > (jornada.corte?.hasta ?? jornada.entro)}
                  puedeMas={jornada.salgo < "22:00"}
                />
              </div>

              {/* Corte al mediodía */}
              <div className="rounded-md border border-industrial-700 bg-industrial-900/40 p-3 space-y-3">
                <button
                  onClick={toggleCorte}
                  disabled={!jornada.corte && !admiteCorte}
                  aria-pressed={Boolean(jornada.corte)}
                  className="w-full flex items-center justify-between gap-3 min-h-[44px] disabled:opacity-50"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Corte al mediodía
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border transition-colors ${
                      jornada.corte
                        ? "bg-tactical-500/30 border-tactical-500/50"
                        : "bg-industrial-800 border-industrial-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${
                        jornada.corte ? "left-[22px] bg-tactical-400" : "left-0.5 bg-slate-500"
                      }`}
                    />
                  </span>
                </button>

                {jornada.corte && (
                  <div className="space-y-3">
                    <HoraStepper
                      label="Desde"
                      valor={jornada.corte.desde}
                      onCambio={(p) => moverCorte("desde", p)}
                      puedeMenos={sumarMedia(jornada.corte.desde, -1) > jornada.entro}
                      puedeMas={sumarMedia(jornada.corte.desde, 1) < jornada.corte.hasta}
                    />
                    <HoraStepper
                      label="Hasta"
                      valor={jornada.corte.hasta}
                      onCambio={(p) => moverCorte("hasta", p)}
                      puedeMenos={sumarMedia(jornada.corte.hasta, -1) > jornada.corte.desde}
                      puedeMas={sumarMedia(jornada.corte.hasta, 1) < jornada.salgo}
                    />
                  </div>
                )}
              </div>

              {/* Barra visual de lo configurado */}
              <div className="pt-1">
                <BarraDisponibilidad rangos={rangosDia} />
                <p className="text-xs text-slate-500 mt-2 text-center font-mono tabular-nums">
                  {rangosAResumen(rangosDia)} · {rangosAHoras(rangosDia)}h
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── Stepper de hora (pasos de 30 min) ─────────────────────────────────────────

const stepperBtnCls =
  "flex items-center justify-center h-11 w-11 flex-shrink-0 rounded-sm " +
  "bg-industrial-700 border border-industrial-600 border-b-[3px] border-b-industrial-950 " +
  "active:border-b active:translate-y-[2px] text-slate-300 hover:text-white " +
  "transition-all duration-150 ease-mech-press " +
  "disabled:opacity-40 disabled:active:border-b-[3px] disabled:active:translate-y-0";

function HoraStepper({
  label,
  valor,
  onCambio,
  puedeMenos,
  puedeMas,
}: {
  label: string;
  valor: string;
  onCambio: (pasos: number) => void;
  puedeMenos: boolean;
  puedeMas: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-300 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onCambio(-1)}
          disabled={!puedeMenos}
          aria-label={`${label}: 30 minutos antes`}
          className={stepperBtnCls}
        >
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="text-xl font-mono font-bold tabular-nums text-white w-[72px] text-center">
          {valor}
        </span>
        <button
          onClick={() => onCambio(1)}
          disabled={!puedeMas}
          aria-label={`${label}: 30 minutos después`}
          className={stepperBtnCls}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

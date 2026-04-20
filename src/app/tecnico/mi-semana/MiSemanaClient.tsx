"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface TareaDia {
  id:          string;
  titulo:      string;
  hora_inicio: string | null;
  hora_fin:    string | null;
  prioridad:   string;
  estado:      string;
  cuenta_calle: string | null;
}

interface DiaSemana {
  fecha:       string;   // ISO
  label:       string;   // "Lun 14"
  labelLargo:  string;   // "Lunes 14 de abril"
  esHoy:       boolean;
  tareas:      TareaDia[];
  horasDisp:   number;   // horas disponibles ese día
}

interface Props {
  dias: DiaSemana[];
  semanaLabel: string;
  offset: number;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const PRIORIDAD_BG: Record<string, string> = {
  ALTA:  "border-l-red-500   bg-red-900/30",
  MEDIA: "border-l-amber-500 bg-amber-900/20",
  BAJA:  "border-l-slate-600 bg-slate-800/60",
};

const ESTADO_DOT: Record<string, string> = {
  PENDIENTE:  "bg-slate-500",
  EN_CURSO:   "bg-sky-400",
  COMPLETADA: "bg-emerald-400",
};

// ── Tarjeta de tarea ──────────────────────────────────────────────────────────

function TareaChip({ t }: { t: TareaDia }) {
  return (
    <Link
      href={`/tecnico/tareas/${t.id}`}
      className={`
        block rounded border-l-2 px-2 py-1.5 text-xs hover:brightness-110 transition-all
        ${PRIORIDAD_BG[t.prioridad] ?? "border-l-slate-600 bg-slate-800/60"}
        ${t.estado === "COMPLETADA" ? "opacity-50" : ""}
      `}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ESTADO_DOT[t.estado] ?? "bg-slate-500"}`} />
        {t.hora_inicio && (
          <span className="font-mono text-[10px] text-slate-400">{t.hora_inicio}</span>
        )}
      </div>
      <p className="font-medium text-white leading-tight line-clamp-2">{t.titulo}</p>
      {t.cuenta_calle && (
        <p className="text-slate-500 text-[10px] mt-0.5 truncate">{t.cuenta_calle}</p>
      )}
    </Link>
  );
}

// ── Vista desktop (7 columnas) ────────────────────────────────────────────────

function VistaDesktop({ dias }: { dias: DiaSemana[] }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {dias.map((dia) => (
        <div key={dia.fecha} className="flex flex-col min-w-0">
          {/* Cabecera columna */}
          <div
            className={`
              rounded-lg px-2 py-2 mb-2 text-center
              ${dia.esHoy
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400"
              }
            `}
          >
            <p className="text-xs font-bold uppercase tracking-wide">{dia.label.split(" ")[0]}</p>
            <p className={`text-lg font-bold leading-none ${dia.esHoy ? "text-white" : "text-slate-200"}`}>
              {dia.label.split(" ")[1]}
            </p>
            {dia.horasDisp > 0 && (
              <p className={`text-[10px] mt-0.5 ${dia.esHoy ? "text-indigo-200" : "text-emerald-500"}`}>
                {dia.horasDisp}h dispon.
              </p>
            )}
          </div>

          {/* Tareas */}
          <div className="flex-1 space-y-1.5 min-h-[80px]">
            {dia.tareas.length === 0 ? (
              <div className="rounded border border-dashed border-slate-800 py-3 text-center">
                <span className="text-slate-700 text-xs">—</span>
              </div>
            ) : (
              dia.tareas
                .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""))
                .map((t) => <TareaChip key={t.id} t={t} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Vista mobile (acordeón) ───────────────────────────────────────────────────

function VistaMobile({ dias }: { dias: DiaSemana[] }) {
  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const hoy = dias.find((d) => d.esHoy);
    if (hoy) set.add(hoy.fecha);
    return set;
  });

  const toggle = (fecha: string) => {
    setAbiertos((prev) => {
      const next = new Set(prev);
      next.has(fecha) ? next.delete(fecha) : next.add(fecha);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {dias.map((dia) => {
        const abierto = abiertos.has(dia.fecha);
        return (
          <div
            key={dia.fecha}
            className={`rounded-xl border overflow-hidden ${
              dia.esHoy ? "border-indigo-600/60" : "border-slate-700/50"
            }`}
          >
            {/* Header acordeón */}
            <button
              onClick={() => toggle(dia.fecha)}
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                dia.esHoy ? "bg-indigo-900/40 hover:bg-indigo-900/60" : "bg-slate-800/60 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                {dia.esHoy && (
                  <span className="text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    Hoy
                  </span>
                )}
                <span className={`text-sm font-semibold capitalize ${dia.esHoy ? "text-white" : "text-slate-300"}`}>
                  {dia.labelLargo}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {dia.tareas.length > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    dia.esHoy ? "bg-indigo-500/30 text-indigo-200" : "bg-slate-700 text-slate-300"
                  }`}>
                    {dia.tareas.length}
                  </span>
                )}
                {dia.horasDisp > 0 && (
                  <span className="text-[10px] text-emerald-500">{dia.horasDisp}h</span>
                )}
                <span className={`text-slate-400 transition-transform ${abierto ? "rotate-90" : ""}`}>›</span>
              </div>
            </button>

            {/* Contenido acordeón */}
            {abierto && (
              <div className="px-3 py-2 bg-slate-900/40 space-y-1.5">
                {dia.tareas.length === 0 ? (
                  <p className="text-xs text-slate-600 py-2 text-center">Sin tareas asignadas</p>
                ) : (
                  dia.tareas
                    .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""))
                    .map((t) => <TareaChip key={t.id} t={t} />)
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente raíz ───────────────────────────────────────────────────────────

export function MiSemanaClient({ dias, semanaLabel, offset }: Props) {
  const totalTareas = dias.reduce((s, d) => s + d.tareas.length, 0);
  const completadas = dias.reduce(
    (s, d) => s + d.tareas.filter((t) => t.estado === "COMPLETADA").length,
    0
  );

  const prevHref = `?semana=${offset - 1}`;
  const nextHref = `?semana=${offset + 1}`;
  const semanaTag = offset === 0 ? "Semana actual" : offset < 0 ? `Hace ${Math.abs(offset)} semana${Math.abs(offset) > 1 ? "s" : ""}` : `En ${offset} semana${offset > 1 ? "s" : ""}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Mi semana</h1>
          <p className="text-sm text-slate-400 mt-0.5">{semanaLabel}</p>
        </div>
        {totalTareas > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{completadas}/{totalTareas}</p>
            <p className="text-xs text-slate-500">completadas</p>
          </div>
        )}
      </div>

      {/* Navegación semanas */}
      <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2">
        <Link
          href={prevHref}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Link>

        <div className="flex items-center gap-2">
          {offset !== 0 && (
            <Link
              href="?semana=0"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
            >
              Hoy
            </Link>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            offset === 0
              ? "bg-indigo-600/30 text-indigo-300"
              : "bg-slate-700 text-slate-400"
          }`}>
            {semanaTag}
          </span>
        </div>

        <Link
          href={nextHref}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-700"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Progress bar */}
      {totalTareas > 0 && (
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(completadas / totalTareas) * 100}%` }}
          />
        </div>
      )}

      {/* Vista responsiva */}
      <div className="hidden lg:block">
        <VistaDesktop dias={dias} />
      </div>
      <div className="lg:hidden">
        <VistaMobile dias={dias} />
      </div>
    </div>
  );
}

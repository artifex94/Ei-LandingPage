"use client";

import Link from "next/link";
import { DisponibilidadEditor } from "./DisponibilidadEditor";

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

// ── Componente principal ───────────────────────────────────────────────────────

export function MiDiaClient({ fechaISO, fechaLabel, tareas, rangosIniciales }: Props) {
  const tareasOrdenadas = [...tareas].sort((a, b) =>
    (a.hora_inicio ?? "99:99").localeCompare(b.hora_inicio ?? "99:99")
  );

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-display font-bold text-white capitalize">{fechaLabel}</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {tareas.length === 0
            ? "Sin tareas asignadas"
            : `${tareas.length} tarea${tareas.length !== 1 ? "s" : ""} asignada${tareas.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* ── Tareas del día ─────────────────────────────────────────────────── */}
      {tareasOrdenadas.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tareas del día</p>
          {tareasOrdenadas.map((t) => (
            <TareaCard key={t.id} tarea={t} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
          <p className="text-slate-500 text-sm">No tenés tareas asignadas para hoy.</p>
        </div>
      )}

      {/* ── Disponibilidad (colapsada) ──────────────────────────────────────── */}
      <DisponibilidadEditor fechaISO={fechaISO} rangosIniciales={rangosIniciales} />
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
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
                {tarea.hora_inicio}
                {tarea.hora_fin && `–${tarea.hora_fin}`}
              </span>
            )}
            <span className="text-sm font-semibold text-white truncate">{tarea.titulo}</span>
          </div>
          {(tarea.cuenta_calle || tarea.cuenta_localidad) && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {[tarea.cuenta_calle, tarea.cuenta_localidad].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
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

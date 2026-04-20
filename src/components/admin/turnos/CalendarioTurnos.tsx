"use client";

import { useMemo, useState, useTransition } from "react";
import type { Empleado, Perfil, Turno } from "@/generated/prisma/client";
import { asignarTurno, eliminarTurno } from "@/lib/actions/turnos";
import { AlertaCobertura } from "./AlertaCobertura";

type PerfilBasico      = Pick<Perfil, "id" | "nombre">;
type EmpleadoConPerfil = Empleado & { perfil: PerfilBasico };
type TurnoConEmpleado  = Turno  & { empleado: EmpleadoConPerfil };

const FRANJAS = ["MANANA", "TARDE", "NOCHE"] as const;

const FRANJA_LABEL: Record<string, string> = {
  MANANA: "Mañana",
  TARDE:  "Tarde",
  NOCHE:  "Noche",
};
const FRANJA_HORAS: Record<string, string> = {
  MANANA: "06 – 14 hs",
  TARDE:  "14 – 22 hs",
  NOCHE:  "22 – 06 hs",
};

// Estilo de chip según estado del turno
const CHIP_STYLE: Record<string, string> = {
  PROGRAMADO:  "bg-slate-700 text-slate-200",
  EN_CURSO:    "bg-emerald-800/70 text-emerald-200 ring-1 ring-emerald-500",
  COMPLETADO:  "bg-slate-800 text-slate-500 opacity-60",
  AUSENTE:     "bg-red-900/60 text-red-300",
  REEMPLAZADO: "bg-amber-900/60 text-amber-300",
};

// ── Selector inline para agregar un monitor a una celda ──────────────────────
function AsignarSelector({
  fecha,
  franja,
  disponibles,
  onAsignar,
  disabled,
}: {
  fecha: Date;
  franja: string;
  disponibles: EmpleadoConPerfil[];
  onAsignar: (emp_id: string, fecha: Date, franja: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (disponibles.length === 0) return null;

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-label={`Agregar monitor — ${FRANJA_LABEL[franja]} del ${fecha.toLocaleDateString("es-AR", { timeZone: "UTC" })}`}
          className="flex items-center gap-1 w-full rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all"
        >
          <span className="text-sm leading-none font-medium">+</span>
          <span>Agregar monitor</span>
        </button>
      ) : (
        <div className="flex gap-1">
          <select
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              onAsignar(e.target.value, fecha, franja);
              setOpen(false);
            }}
            className="flex-1 bg-slate-700 border border-slate-500 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-orange-400"
          >
            <option value="" disabled>Seleccionar monitor…</option>
            {disponibles.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.perfil.nombre.split(" ").slice(0, 2).join(" ")}
              </option>
            ))}
          </select>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-500 hover:text-slate-300 px-1.5 text-sm transition-colors"
            aria-label="Cancelar"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Celda individual del grid ────────────────────────────────────────────────
function TurnoCell({
  fecha,
  franja,
  turnos,
  disponibles,
  onAsignar,
  onEliminar,
  pending,
  esHoy,
}: {
  fecha: Date;
  franja: string;
  turnos: TurnoConEmpleado[];
  disponibles: EmpleadoConPerfil[];
  onAsignar: (emp_id: string, fecha: Date, franja: string) => void;
  onEliminar: (turno_id: string) => void;
  pending: boolean;
  esHoy: boolean;
}) {
  const cubierta = turnos.some(
    (t) => t.estado === "PROGRAMADO" || t.estado === "EN_CURSO"
  );

  return (
    <td
      className={`px-2 py-2 align-top border-r border-slate-800 last:border-r-0 min-w-[130px]
        ${esHoy ? "bg-orange-950/10" : "bg-slate-900"}
        ${!cubierta ? "bg-red-950/10" : ""}`}
    >
      <div className="space-y-1 min-h-[36px]">
        {/* Chip por cada monitor asignado */}
        {turnos.map((turno) => (
          <div
            key={turno.id}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${CHIP_STYLE[turno.estado] ?? CHIP_STYLE.PROGRAMADO}`}
          >
            {/* Punto de color del empleado */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: turno.empleado.color_calendario ?? "#6366f1" }}
              aria-hidden="true"
            />
            {/* Nombre */}
            <span className="truncate flex-1 leading-tight">
              {turno.empleado.perfil.nombre.split(" ").slice(0, 2).join(" ")}
            </span>
            {/* Etiqueta de duración — deja claro que cubre 8 horas completas */}
            <span className="text-slate-500 text-xs flex-shrink-0 font-mono">8h</span>
            {/* Quitar */}
            <button
              onClick={() => onEliminar(turno.id)}
              disabled={pending}
              className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 leading-none"
              aria-label={`Quitar turno de ${turno.empleado.perfil.nombre}`}
            >
              ×
            </button>
          </div>
        ))}

        {/* Botón / selector para agregar más monitores */}
        <AsignarSelector
          fecha={fecha}
          franja={franja}
          disponibles={disponibles}
          onAsignar={onAsignar}
          disabled={pending}
        />
      </div>
    </td>
  );
}

// ── Calendario semanal ───────────────────────────────────────────────────────
export function CalendarioTurnos({
  empleados,
  turnos: turnosIniciales,
  semanaDesde,
  hoyIso,
}: {
  empleados: EmpleadoConPerfil[];
  turnos: TurnoConEmpleado[];
  semanaDesde: string;
  hoyIso: string;
}) {
  const [turnos, setTurnos] = useState(turnosIniciales);
  const [pending, startTransition] = useTransition();

  // Derivado de las props del servidor — construidos en UTC para evitar
  // desfase horario entre server (UTC) y cliente (Argentina UTC-3).
  const hoy = useMemo(() => {
    const [y, m, d] = hoyIso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }, [hoyIso]);

  const dias = useMemo(() => {
    const [y, m, d] = semanaDesde.split("-").map(Number);
    return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)));
  }, [semanaDesde]);

  function sameDay(a: Date, b: Date) {
    return (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth()    === b.getUTCMonth()    &&
      a.getUTCDate()     === b.getUTCDate()
    );
  }

  function getTurnosCelda(fecha: Date, franja: string): TurnoConEmpleado[] {
    return turnos.filter(
      (t) => sameDay(new Date(t.fecha), fecha) && t.franja === franja
    );
  }

  function getDisponibles(fecha: Date, franja: string): EmpleadoConPerfil[] {
    const asignados = new Set(getTurnosCelda(fecha, franja).map((t) => t.empleado_id));
    return empleados.filter((e) => !asignados.has(e.id));
  }

  // Calculado desde el estado local → se actualiza en tiempo real al asignar/quitar
  const diasSinCobertura = useMemo(() => {
    const huecos: { fecha: Date; franja: string }[] = [];
    for (const fecha of dias) {
      for (const franja of FRANJAS) {
        const cubre = turnos.some(
          (t) =>
            sameDay(new Date(t.fecha), fecha) &&
            t.franja === franja &&
            (t.estado === "PROGRAMADO" || t.estado === "EN_CURSO")
        );
        if (!cubre) huecos.push({ fecha, franja });
      }
    }
    return huecos;
  }, [turnos, dias]);

  function handleAsignar(emp_id: string, fecha: Date, franja: string) {
    startTransition(async () => {
      const turno = await asignarTurno({
        empleado_id: emp_id,
        fecha,
        franja: franja as "MANANA" | "TARDE" | "NOCHE",
      });
      const empleado = empleados.find((e) => e.id === emp_id)!;
      setTurnos((prev) => [...prev, { ...turno, empleado }]);
    });
  }

  function handleEliminar(turno_id: string) {
    startTransition(async () => {
      await eliminarTurno(turno_id);
      setTurnos((prev) => prev.filter((t) => t.id !== turno_id));
    });
  }

  return (
    <div className="space-y-4">
      {diasSinCobertura.length > 0 && (
        <AlertaCobertura huecos={diasSinCobertura} />
      )}

    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-xs border-collapse">
        {/* Encabezado: días de la semana */}
        <thead>
          <tr className="bg-slate-800 border-b border-slate-700">
            <th className="text-left px-3 py-3 text-slate-400 font-medium w-28 sticky left-0 bg-slate-800 z-10">
              Franja
            </th>
            {dias.map((fecha, i) => {
              const esHoy = sameDay(fecha, hoy);
              return (
                <th
                  key={i}
                  className={`px-2 py-3 text-center font-medium min-w-[130px] ${
                    esHoy ? "bg-orange-950/30" : ""
                  }`}
                >
                  <div className={`text-xs ${esHoy ? "text-orange-300" : "text-slate-400"}`}>
                    {fecha.toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" })}
                  </div>
                  <div
                    className={`text-lg font-bold leading-tight ${
                      esHoy ? "text-orange-300" : "text-slate-200"
                    }`}
                  >
                    {fecha.getUTCDate()}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Cuerpo: una fila por franja */}
        <tbody className="divide-y divide-slate-700/50">
          {FRANJAS.map((franja) => (
            <tr key={franja}>
              {/* Etiqueta de franja con horario y duración */}
              <td className="px-3 py-3 border-r border-slate-700 align-top sticky left-0 bg-slate-900 z-10">
                <p className="font-semibold text-slate-200">{FRANJA_LABEL[franja]}</p>
                <p className="text-slate-500 mt-0.5">{FRANJA_HORAS[franja]}</p>
                <p className="text-slate-600 mt-1 font-medium">8 hs completas</p>
              </td>

              {/* Celdas de días */}
              {dias.map((fecha, di) => (
                <TurnoCell
                  key={di}
                  fecha={fecha}
                  franja={franja}
                  turnos={getTurnosCelda(fecha, franja)}
                  disponibles={getDisponibles(fecha, franja)}
                  onAsignar={handleAsignar}
                  onEliminar={handleEliminar}
                  pending={pending}
                  esHoy={sameDay(fecha, hoy)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-slate-700 bg-slate-800/50 text-xs text-slate-500">
        <span className="font-medium text-slate-400">Leyenda:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Programado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-800/70 ring-1 ring-emerald-500 inline-block" /> En curso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-950/40 inline-block" /> Sin cobertura
        </span>
        <span className="ml-auto italic">
          Cada chip cubre la franja completa (8 hs). Podés asignar múltiples monitores a la misma franja.
        </span>
      </div>
    </div>
    </div>
  );
}

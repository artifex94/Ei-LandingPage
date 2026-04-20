"use client";

import { useActionState } from "react";
import Link from "next/link";
import { editarTarea, type AgendaActionResult } from "../actions";

interface Tecnico { id: string; nombre: string }
interface Cuenta { id: string; descripcion: string; calle: string | null; localidad: string | null }
interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  fechaISO: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  prioridad: "BAJA" | "MEDIA" | "ALTA";
  estado: "PENDIENTE" | "EN_CURSO" | "COMPLETADA" | "CANCELADA";
  tecnico_id: string;
  cuenta_id: string | null;
  notas_tecnico: string | null;
}

const initialState: AgendaActionResult = {};

export function EditarTareaForm({
  tarea,
  tecnicos,
  cuentas,
}: {
  tarea: Tarea;
  tecnicos: Tecnico[];
  cuentas: Cuenta[];
}) {
  const [state, formAction, pending] = useActionState<AgendaActionResult, FormData>(editarTarea, initialState);

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/agenda" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Agenda
        </Link>
        <h1 className="text-xl font-bold text-white">Editar tarea</h1>
      </div>

      {tarea.notas_tecnico && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            Notas del técnico
          </p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{tarea.notas_tecnico}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={tarea.id} />

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            name="titulo"
            required
            defaultValue={tarea.titulo}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descripción</label>
          <textarea
            name="descripcion"
            rows={2}
            defaultValue={tarea.descripcion ?? ""}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Técnico <span className="text-red-400">*</span>
          </label>
          <select
            name="tecnico_id"
            required
            defaultValue={tarea.tecnico_id}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Fecha <span className="text-red-400">*</span>
            </label>
            <input
              name="fecha"
              type="date"
              required
              defaultValue={tarea.fechaISO}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Desde</label>
            <input
              name="hora_inicio"
              type="time"
              defaultValue={tarea.hora_inicio ?? ""}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Hasta</label>
            <input
              name="hora_fin"
              type="time"
              defaultValue={tarea.hora_fin ?? ""}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cuenta del cliente</label>
          <select
            name="cuenta_id"
            defaultValue={tarea.cuenta_id ?? ""}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Sin cuenta asociada</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.descripcion}{c.localidad ? ` · ${c.localidad}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Prioridad</label>
            <select
              name="prioridad"
              defaultValue={tarea.prioridad}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta — Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Estado</label>
            <select
              name="estado"
              defaultValue={tarea.estado}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_CURSO">En curso</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>

        {state.errores && state.errores.length > 0 && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            {state.errores.map((e) => (
              <p key={e} className="text-sm text-red-400">{e}</p>
            ))}
          </div>
        )}

        {state.ok && (
          <p className="text-sm text-emerald-400 font-medium">Tarea actualizada.</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg transition-colors"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

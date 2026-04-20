"use client";

import { useActionState } from "react";
import Link from "next/link";
import { crearTarea, type AgendaActionResult } from "../actions";

interface Tecnico { id: string; nombre: string }
interface Cuenta { id: string; descripcion: string; calle: string | null; localidad: string | null }

const initialState: AgendaActionResult = {};

export function NuevaTareaForm({
  tecnicos,
  cuentas,
}: {
  tecnicos: Tecnico[];
  cuentas: Cuenta[];
}) {
  const [state, formAction, pending] = useActionState<AgendaActionResult, FormData>(crearTarea, initialState);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/agenda" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Agenda
        </Link>
        <h1 className="text-xl font-bold text-white">Nueva tarea</h1>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            name="titulo"
            required
            placeholder="Mantenimiento preventivo alarma"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descripción</label>
          <textarea
            name="descripcion"
            rows={2}
            placeholder="Detalles del trabajo a realizar…"
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
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar técnico…</option>
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
              defaultValue={hoy}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Desde</label>
            <input
              name="hora_inicio"
              type="time"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Hasta</label>
            <input
              name="hora_fin"
              type="time"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Cuenta del cliente (opcional)
          </label>
          <select
            name="cuenta_id"
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

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Prioridad</label>
          <select
            name="prioridad"
            defaultValue="MEDIA"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta — Urgente</option>
          </select>
        </div>

        {state.errores && state.errores.length > 0 && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            {state.errores.map((e) => (
              <p key={e} className="text-sm text-red-400">{e}</p>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg transition-colors"
        >
          {pending ? "Guardando…" : "Crear tarea"}
        </button>
      </form>
    </div>
  );
}

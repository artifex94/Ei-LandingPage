"use client";

import { useState, useActionState } from "react";
import { crearSolicitudMantenimiento } from "@/app/admin/mantenimiento/actions";

interface Props {
  cuentaId: string;
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

export function NuevaSolicitudForm({ cuentaId }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [state, action, pending] = useActionState(crearSolicitudMantenimiento, {});

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors border border-orange-700/40 hover:border-orange-600 rounded-xl px-4 py-3 w-full justify-center"
      >
        <span aria-hidden="true" className="text-lg leading-none">+</span>
        Crear solicitud de mantenimiento
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-orange-700/40 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Nueva solicitud</h3>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="cuenta_id" value={cuentaId} />

        {state.ok && (
          <p className="text-green-400 text-sm font-medium bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
            Solicitud creada correctamente.
          </p>
        )}
        {state.errores && (
          <div className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg p-3">
            <ul className="text-sm list-disc list-inside">
              {state.errores.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div>
          <label htmlFor="sol-descripcion" className="block text-sm font-medium text-slate-300 mb-1">
            Descripción <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="sol-descripcion"
            name="descripcion"
            rows={3}
            required
            placeholder="Describí el problema o tarea de mantenimiento..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="w-40">
          <label htmlFor="sol-prioridad" className="block text-sm font-medium text-slate-300 mb-1">
            Prioridad
          </label>
          <select id="sol-prioridad" name="prioridad" defaultValue="MEDIA" className={inputCls}>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
          </select>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {pending ? "Creando…" : "Crear solicitud"}
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-slate-400 hover:text-white px-4 py-2.5 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { crearTecnico, type TecnicoActionResult } from "./actions";

const initialState: TecnicoActionResult = {};

export default function NuevoTecnicoPage() {
  const [state, formAction, pending] = useActionState<TecnicoActionResult, FormData>(crearTecnico, initialState);

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tecnicos" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Técnicos
        </Link>
        <h1 className="text-xl font-bold text-white">Nuevo técnico</h1>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Nombre completo <span className="text-red-400">*</span>
          </label>
          <input
            name="nombre"
            required
            placeholder="Ariel García"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="tecnico@escobarinstalaciones.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Teléfono
          </label>
          <input
            name="telefono"
            type="tel"
            placeholder="3436575372"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Contraseña inicial <span className="text-red-400">*</span>
          </label>
          <input
            name="password"
            type="password"
            required
            placeholder="Mín. 8 caracteres"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            El técnico podrá cambiar su contraseña después del primer acceso.
          </p>
        </div>

        {state.errores && state.errores.length > 0 && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            {state.errores.map((e) => (
              <p key={e} className="text-sm text-red-400">
                {e}
              </p>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg transition-colors"
        >
          {pending ? "Creando…" : "Crear técnico"}
        </button>
      </form>
    </div>
  );
}

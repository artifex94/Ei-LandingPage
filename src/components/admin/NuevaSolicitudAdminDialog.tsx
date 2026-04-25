"use client";

import { useState, useActionState } from "react";
import { crearSolicitudMantenimiento } from "@/app/admin/mantenimiento/actions";

interface CuentaItem {
  id: string;
  descripcion: string;
  softguard_ref: string;
  perfilNombre: string;
}

const inputCls = "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

export function NuevaSolicitudAdminDialog({ cuentas }: { cuentas: CuentaItem[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(crearSolicitudMantenimiento, {});

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        + Nueva solicitud
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Nueva solicitud de mantenimiento</h2>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>

            {state.ok && (
              <p className="text-green-400 text-sm bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
                Solicitud creada correctamente.
              </p>
            )}
            {state.errores && (
              <div className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg p-3 text-sm space-y-1">
                {state.errores.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            <form action={action} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Cuenta / Servicio <span className="text-red-400">*</span>
                </label>
                <select name="cuenta_id" required className={inputCls}>
                  <option value="">Seleccionar cuenta…</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.perfilNombre} — {c.descripcion} ({c.softguard_ref})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Descripción <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="descripcion"
                  rows={3}
                  required
                  placeholder="Describí el problema o tarea de mantenimiento…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="w-40">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Prioridad</label>
                <select name="prioridad" defaultValue="MEDIA" className={inputCls}>
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  {pending ? "Creando…" : "Crear solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

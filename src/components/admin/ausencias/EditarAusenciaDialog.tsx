"use client";

import { useState, useTransition } from "react";
import { editarAusencia } from "@/lib/actions/ausencias";
import type { Ausencia } from "@/generated/prisma/client";

function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function EditarAusenciaDialog({ ausencia, nombreEmpleado }: { ausencia: Ausencia; nombreEmpleado: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await editarAusencia(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); }}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        Editar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Editar ausencia</h2>
                <p className="text-xs text-slate-400 mt-0.5">{nombreEmpleado}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>

            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="id" value={ausencia.id} />

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo</label>
                <select
                  name="tipo"
                  defaultValue={ausencia.tipo}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="VACACIONES">Vacaciones</option>
                  <option value="ENFERMEDAD">Enfermedad</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="FERIADO">Feriado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Desde</label>
                  <input
                    name="desde"
                    type="date"
                    required
                    defaultValue={toDateInput(ausencia.desde)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Hasta</label>
                  <input
                    name="hasta"
                    type="date"
                    required
                    defaultValue={toDateInput(ausencia.hasta)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notas</label>
                <textarea
                  name="notas"
                  rows={2}
                  defaultValue={ausencia.notas ?? ""}
                  placeholder="Motivo, observaciones…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  {pending ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

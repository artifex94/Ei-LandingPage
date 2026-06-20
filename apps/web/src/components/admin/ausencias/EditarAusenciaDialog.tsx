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
  const [desde, setDesde] = useState(toDateInput(ausencia.desde));
  const [hasta, setHasta] = useState(toDateInput(ausencia.hasta));

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
        aria-label={`Editar ausencia de ${nombreEmpleado}`}
        className="text-xs text-orange-400 hover:text-orange-300 transition-colors px-2 py-1.5 rounded min-h-[36px] flex items-center"
      >
        Editar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="editar-ausencia-title"
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="editar-ausencia-title" className="text-base font-bold text-white">Editar ausencia</h2>
                <p className="text-xs text-slate-400 mt-0.5">{nombreEmpleado}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar diálogo"
                className="text-slate-500 hover:text-white text-lg leading-none min-h-[36px] min-w-[36px] flex items-center justify-center rounded"
              >×</button>
            </div>

            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="id" value={ausencia.id} />

              <div>
                <label htmlFor="ea-tipo" className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo</label>
                <select
                  id="ea-tipo"
                  name="tipo"
                  defaultValue={ausencia.tipo}
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:outline-2 focus:outline-orange-500"
                >
                  <option value="VACACIONES">Vacaciones</option>
                  <option value="ENFERMEDAD">Enfermedad</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="FERIADO">Feriado</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ea-desde" className="block text-xs font-semibold text-slate-400 mb-1.5">Desde</label>
                  <input
                    id="ea-desde"
                    name="desde"
                    type="date"
                    required
                    value={desde}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDesde(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:outline-2 focus:outline-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="ea-hasta" className="block text-xs font-semibold text-slate-400 mb-1.5">Hasta</label>
                  <input
                    id="ea-hasta"
                    name="hasta"
                    type="date"
                    required
                    value={hasta}
                    min={desde || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:outline-2 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ea-notas" className="block text-xs font-semibold text-slate-400 mb-1.5">Notas</label>
                <textarea
                  id="ea-notas"
                  name="notas"
                  rows={2}
                  defaultValue={ausencia.notas ?? ""}
                  placeholder="Motivo, observaciones…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:outline-2 focus:outline-orange-500 resize-none"
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
                  className="flex-1 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-slate-900 px-4 py-2.5 rounded-lg transition-colors"
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

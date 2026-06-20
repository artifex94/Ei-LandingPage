"use client";

import { useState, useTransition } from "react";
import { crearAusencia } from "@/lib/actions/ausencias";
import type { Empleado } from "@/generated/prisma/client";

type EmpleadoConPerfil = Empleado & { perfil: { nombre: string } };

export function NuevaAusenciaDialog({ empleados }: { empleados: EmpleadoConPerfil[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  function handleSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await crearAusencia(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-slate-900 px-4 py-2 min-h-[44px] rounded-lg transition-colors"
      >
        + Nueva ausencia
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
            aria-labelledby="nueva-ausencia-title"
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 id="nueva-ausencia-title" className="text-lg font-bold text-white">Nueva ausencia</h2>

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="na-empleado" className="block text-xs font-semibold text-slate-400 mb-1.5">Empleado</label>
                <select
                  id="na-empleado"
                  name="empleado_id"
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:outline-2 focus:outline-orange-500"
                >
                  <option value="">Seleccionar…</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>{e.perfil.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="na-tipo" className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo</label>
                <select
                  id="na-tipo"
                  name="tipo"
                  required
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
                  <label htmlFor="na-desde" className="block text-xs font-semibold text-slate-400 mb-1.5">Desde</label>
                  <input
                    id="na-desde"
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
                  <label htmlFor="na-hasta" className="block text-xs font-semibold text-slate-400 mb-1.5">Hasta</label>
                  <input
                    id="na-hasta"
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
                <label htmlFor="na-notas" className="block text-xs font-semibold text-slate-400 mb-1.5">Notas (opcional)</label>
                <textarea
                  id="na-notas"
                  name="notas"
                  rows={2}
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

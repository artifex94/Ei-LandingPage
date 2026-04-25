"use client";

import { useState, useActionState } from "react";
import { editarVehiculo } from "@/lib/actions/vehiculo";
import type { Vehiculo } from "@/generated/prisma/client";

const inputCls = "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function EditarVehiculoDialog({ vehiculo }: { vehiculo: Vehiculo }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(editarVehiculo, {});

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
      >
        Editar vehículo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Editar vehículo</h2>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>

            {state.ok && (
              <p className="text-green-400 text-sm bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
                Vehículo actualizado correctamente.
              </p>
            )}
            {state.errores && (
              <div className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg p-3 text-sm space-y-1">
                {state.errores.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            <form action={action} className="space-y-3">
              <input type="hidden" name="id" value={vehiculo.id} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Marca <span className="text-red-400">*</span></label>
                  <input name="marca" type="text" required defaultValue={vehiculo.marca} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Modelo <span className="text-red-400">*</span></label>
                  <input name="modelo" type="text" required defaultValue={vehiculo.modelo} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Año <span className="text-red-400">*</span></label>
                  <input name="anio" type="number" min="1990" max="2100" required defaultValue={vehiculo.anio} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Patente <span className="text-red-400">*</span></label>
                  <input name="patente" type="text" required defaultValue={vehiculo.patente} className={`${inputCls} uppercase`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Km actual <span className="text-red-400">*</span></label>
                <input name="km_actual" type="number" min="0" required defaultValue={vehiculo.km_actual} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Próximo service (km)</label>
                  <input
                    name="proximo_service_km"
                    type="number"
                    min="0"
                    defaultValue={vehiculo.proximo_service_km ?? ""}
                    placeholder="Ej: 150000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Próximo service (fecha)</label>
                  <input
                    name="proximo_service_fecha"
                    type="date"
                    defaultValue={toDateInput(vehiculo.proximo_service_fecha)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  defaultValue={vehiculo.observaciones ?? ""}
                  placeholder="Estado del vehículo, equipamiento, notas…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  {pending ? "Guardando…" : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

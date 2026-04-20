"use client";

import { useState, useTransition } from "react";
import type { Vehiculo } from "@/generated/prisma/client";
import { actualizarKmVehiculo } from "@/lib/actions/vehiculo";

export function VehiculoCard({ vehiculo }: { vehiculo: Vehiculo }) {
  const [editandoKm, setEditandoKm] = useState(false);
  const [km, setKm] = useState(vehiculo.km_actual.toString());
  const [pending, startTransition] = useTransition();

  function guardarKm() {
    const val = parseInt(km, 10);
    if (isNaN(val) || val < 0) return;
    startTransition(async () => {
      await actualizarKmVehiculo(vehiculo.id, val);
      setEditandoKm(false);
    });
  }

  const kmAlService = vehiculo.proximo_service_km
    ? vehiculo.proximo_service_km - vehiculo.km_actual
    : null;

  const alertaService =
    kmAlService !== null && kmAlService < 500 && kmAlService >= 0;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {vehiculo.marca} {vehiculo.modelo}{" "}
            <span className="text-slate-400 font-normal text-base">({vehiculo.anio})</span>
          </h2>
          <p className="text-sm text-slate-400 font-mono mt-0.5">{vehiculo.patente}</p>
        </div>

        <div className="text-right">
          {editandoKm ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className="w-28 rounded border border-slate-600 bg-slate-700 text-white px-2 py-1 text-sm text-right"
                aria-label="Kilómetros actuales"
              />
              <button
                onClick={guardarKm}
                disabled={pending}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                onClick={() => { setEditandoKm(false); setKm(vehiculo.km_actual.toString()); }}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditandoKm(true)}
              className="text-right group"
              aria-label="Editar kilómetros"
            >
              <p className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                {vehiculo.km_actual.toLocaleString("es-AR")} km
              </p>
              <p className="text-xs text-slate-500 group-hover:text-slate-400">click para actualizar</p>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {vehiculo.proximo_service_km && (
          <div className={`flex items-center gap-1.5 ${alertaService ? "text-amber-400" : "text-slate-400"}`}>
            {alertaService && <span aria-hidden="true">⚠</span>}
            <span>
              Próximo service:{" "}
              <strong className={alertaService ? "text-amber-300" : "text-slate-200"}>
                {vehiculo.proximo_service_km.toLocaleString("es-AR")} km
              </strong>
              {kmAlService !== null && (
                <span className="text-slate-500 ml-1">
                  ({kmAlService > 0 ? `faltan ${kmAlService.toLocaleString("es-AR")} km` : "¡vencido!"})
                </span>
              )}
            </span>
          </div>
        )}

        {vehiculo.proximo_service_fecha && (
          <div className="text-slate-400">
            Fecha service:{" "}
            <strong className="text-slate-200">
              {new Date(vehiculo.proximo_service_fecha).toLocaleDateString("es-AR")}
            </strong>
          </div>
        )}
      </div>

      {vehiculo.observaciones && (
        <p className="mt-3 text-sm text-slate-400 border-t border-slate-700 pt-3">
          {vehiculo.observaciones}
        </p>
      )}
    </div>
  );
}

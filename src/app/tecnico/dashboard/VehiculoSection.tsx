"use client";

import { useTransition } from "react";
import { Car, CheckCircle, Circle } from "lucide-react";
import { reservarVehiculo, liberarVehiculo } from "@/lib/actions/vehiculo-reserva";

interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  km_actual: number;
}

interface ReservaActual {
  id: string;
  vehiculo: Vehiculo;
}

interface Props {
  reservaActual: ReservaActual | null;
  vehiculosDisponibles: Vehiculo[];
  tieneEmpleado: boolean;
}

export function VehiculoSection({ reservaActual, vehiculosDisponibles, tieneEmpleado }: Props) {
  const [pending, startTransition] = useTransition();

  if (!tieneEmpleado) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 flex items-center gap-3">
        <Car className="w-5 h-5 text-slate-500 flex-shrink-0" />
        <p className="text-sm text-slate-400">La gestión de vehículos requiere un registro de empleado. Consultá al administrador.</p>
      </div>
    );
  }

  // Vehículo asignado hoy
  if (reservaActual) {
    const v = reservaActual.vehiculo;
    return (
      <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Vehículo asignado</p>
              <p className="text-sm font-bold text-white">{v.marca} {v.modelo} <span className="font-normal text-slate-400">({v.anio})</span></p>
              <p className="text-xs text-slate-400">{v.patente} · {v.km_actual.toLocaleString("es-AR")} km</p>
            </div>
          </div>
          <button
            disabled={pending}
            onClick={() => startTransition(async () => { await liberarVehiculo(reservaActual.id); })}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 px-2 py-1 rounded hover:bg-slate-800"
          >
            {pending ? "…" : "Liberar"}
          </button>
        </div>
      </div>
    );
  }

  // Sin vehículo asignado — mostrar disponibles
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Car className="w-4 h-4 text-slate-500" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Vehículos disponibles hoy</p>
      </div>

      {vehiculosDisponibles.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-3">No hay vehículos disponibles.</p>
      ) : (
        <div className="space-y-1.5">
          {vehiculosDisponibles.map((v) => (
            <button
              key={v.id}
              disabled={pending}
              onClick={() => startTransition(async () => { await reservarVehiculo(v.id); })}
              className="w-full flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-indigo-500/50 transition-all px-3 py-2.5 group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Circle className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{v.marca} {v.modelo}</p>
                  <p className="text-xs text-slate-400">{v.patente} · {v.anio} · {v.km_actual.toLocaleString("es-AR")} km</p>
                </div>
              </div>
              <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                Tomar →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

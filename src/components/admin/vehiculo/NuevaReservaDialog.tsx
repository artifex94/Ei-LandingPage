"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Empleado, Perfil, Vehiculo } from "@/generated/prisma/client";
import { crearReservaVehiculo } from "@/lib/actions/vehiculo";

type VehiculoConReservas = Vehiculo & { reservas: unknown[] };
type EmpleadoConPerfil = Empleado & { perfil: Perfil };

export function NuevaReservaDialog({
  vehiculos,
  empleados,
}: {
  vehiculos: VehiculoConReservas[];
  empleados: EmpleadoConPerfil[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const vehiculo_id  = fd.get("vehiculo_id")  as string;
    const empleado_id  = fd.get("empleado_id")  as string;
    const desde_str    = fd.get("desde")        as string;
    const hasta_str    = fd.get("hasta")        as string;
    const km_inicial   = fd.get("km_inicial")   as string;
    const notas        = fd.get("notas")        as string;

    if (!vehiculo_id || !empleado_id || !desde_str || !hasta_str) {
      setError("Completá todos los campos requeridos.");
      return;
    }

    const desde = new Date(desde_str);
    const hasta = new Date(hasta_str);

    if (hasta <= desde) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }

    startTransition(async () => {
      try {
        await crearReservaVehiculo({
          vehiculo_id,
          empleado_id,
          desde,
          hasta,
          km_inicial: km_inicial ? parseInt(km_inicial, 10) : undefined,
          notas: notas || undefined,
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <span aria-hidden="true">+</span> Nueva reserva
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          aria-describedby="nueva-reserva-desc"
        >
          <Dialog.Title className="text-lg font-semibold text-white mb-1">
            Nueva reserva de vehículo
          </Dialog.Title>
          <Dialog.Description id="nueva-reserva-desc" className="text-sm text-slate-400 mb-5">
            Reservá el vehículo para un empleado en un rango horario.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="vehiculo_id" className="block text-sm font-medium text-slate-300 mb-1">
                Vehículo <span aria-hidden="true" className="text-red-400">*</span>
              </label>
              <select
                id="vehiculo_id"
                name="vehiculo_id"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} — {v.patente}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="empleado_id" className="block text-sm font-medium text-slate-300 mb-1">
                Empleado <span aria-hidden="true" className="text-red-400">*</span>
              </label>
              <select
                id="empleado_id"
                name="empleado_id"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar…</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>{e.perfil.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="desde" className="block text-sm font-medium text-slate-300 mb-1">
                  Desde <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                  id="desde"
                  name="desde"
                  type="datetime-local"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="hasta" className="block text-sm font-medium text-slate-300 mb-1">
                  Hasta <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                  id="hasta"
                  name="hasta"
                  type="datetime-local"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="km_inicial" className="block text-sm font-medium text-slate-300 mb-1">
                Km al salir (opcional)
              </label>
              <input
                id="km_inicial"
                name="km_inicial"
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="notas" className="block text-sm font-medium text-slate-300 mb-1">
                Notas (opcional)
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {pending ? "Reservando…" : "Reservar"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

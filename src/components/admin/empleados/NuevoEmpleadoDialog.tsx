"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Perfil, RolEmpleado } from "@/generated/prisma/client";
import { crearEmpleado } from "@/lib/actions/empleados";

const ROLES: { value: RolEmpleado; label: string }[] = [
  { value: "ADMIN_GENERAL",  label: "Admin general" },
  { value: "MONITOR",        label: "Monitor" },
  { value: "TECNICO",        label: "Técnico" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
];

export function NuevoEmpleadoDialog({
  perfilesDisponibles,
  coloresDisponibles,
}: {
  perfilesDisponibles: Perfil[];
  coloresDisponibles: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const perfil_id = fd.get("perfil_id") as string;
    const rol_empleado = fd.get("rol_empleado") as RolEmpleado;
    const color_calendario = fd.get("color_calendario") as string;

    if (!perfil_id || !rol_empleado) {
      setError("Completá todos los campos requeridos.");
      return;
    }

    startTransition(async () => {
      try {
        await crearEmpleado({
          perfil_id,
          rol_empleado,
          puede_monitorear: fd.get("puede_monitorear") === "on",
          puede_instalar:   fd.get("puede_instalar")   === "on",
          puede_facturar:   fd.get("puede_facturar")   === "on",
          color_calendario: color_calendario || undefined,
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
          <span aria-hidden="true">+</span> Nuevo empleado
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          aria-describedby="nuevo-empleado-desc"
        >
          <Dialog.Title className="text-lg font-semibold text-white mb-1">
            Nuevo empleado
          </Dialog.Title>
          <Dialog.Description id="nuevo-empleado-desc" className="text-sm text-slate-400 mb-5">
            Asociá un perfil existente al equipo de Escobar Instalaciones.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Perfil */}
            <div>
              <label htmlFor="perfil_id" className="block text-sm font-medium text-slate-300 mb-1">
                Perfil <span aria-hidden="true" className="text-red-400">*</span>
              </label>
              {perfilesDisponibles.length === 0 ? (
                <p className="text-sm text-amber-400">
                  No hay perfiles ADMIN sin empleado asignado. Creá uno primero en Clientes.
                </p>
              ) : (
                <select
                  id="perfil_id"
                  name="perfil_id"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar…</option>
                  {perfilesDisponibles.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Rol */}
            <div>
              <label htmlFor="rol_empleado" className="block text-sm font-medium text-slate-300 mb-1">
                Rol <span aria-hidden="true" className="text-red-400">*</span>
              </label>
              <select
                id="rol_empleado"
                name="rol_empleado"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar…</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Capacidades */}
            <fieldset>
              <legend className="text-sm font-medium text-slate-300 mb-2">Capacidades</legend>
              <div className="space-y-2">
                {[
                  { name: "puede_monitorear", label: "Puede monitorear alarmas" },
                  { name: "puede_instalar",   label: "Puede instalar / hacer OT" },
                  { name: "puede_facturar",   label: "Puede facturar (AFIP)" },
                ].map(({ name, label }) => (
                  <label key={name} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name={name}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Color calendario */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Color en el calendario</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Color de calendario">
                {coloresDisponibles.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color_calendario"
                      value={color}
                      className="sr-only"
                    />
                    <span
                      className="block w-7 h-7 rounded-full ring-2 ring-transparent hover:ring-white/40 transition-all"
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending || perfilesDisponibles.length === 0}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? "Guardando…" : "Crear empleado"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

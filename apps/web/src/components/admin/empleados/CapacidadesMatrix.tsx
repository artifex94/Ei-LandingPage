"use client";

import { useState, useTransition } from "react";
import type { Empleado, Perfil } from "@/generated/prisma/client";
import { toggleCapacidadEmpleado } from "@/lib/actions/empleados";

type EmpleadoConPerfil = Empleado & { perfil: Perfil };

const CAPACIDADES = [
  { key: "puede_monitorear", label: "Monitoreo" },
  { key: "puede_instalar", label: "Instalación" },
  { key: "puede_facturar", label: "Facturación" },
] as const;

/**
 * Matriz empleados × capacidades con toggles individuales.
 * Rol y estado activo NO se editan acá — solo los 3 flags de capacidad
 * (ver EditarEmpleadoForm para el resto de los datos del empleado).
 */
export function CapacidadesMatrix({ empleados }: { empleados: EmpleadoConPerfil[] }) {
  const [pending, startTransition] = useTransition();
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const activos = empleados.filter((e) => e.activo);
  if (activos.length === 0) return null;

  function handleToggle(emp: EmpleadoConPerfil, capacidad: (typeof CAPACIDADES)[number]["key"]) {
    const cellId = `${emp.id}-${capacidad}`;
    setPendingCell(cellId);
    startTransition(async () => {
      await toggleCapacidadEmpleado(emp.id, capacidad, !emp[capacidad]);
      setPendingCell(null);
    });
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Matriz de capacidades por empleado activo</caption>
        <thead>
          <tr className="border-b border-slate-700 text-left text-xs uppercase text-slate-400">
            <th scope="col" className="px-4 py-3 font-medium">Empleado</th>
            {CAPACIDADES.map((c) => (
              <th key={c.key} scope="col" className="px-4 py-3 font-medium text-center">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activos.map((emp) => (
            <tr key={emp.id} className="border-b border-slate-700/60 last:border-0">
              <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{emp.perfil.nombre}</td>
              {CAPACIDADES.map((c) => {
                const checked = emp[c.key];
                const cellId = `${emp.id}-${c.key}`;
                const disabled = pending && pendingCell === cellId;
                return (
                  <td key={c.key} className="px-4 py-3 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={`${checked ? "Quitar" : "Otorgar"} capacidad de ${c.label} a ${emp.perfil.nombre}`}
                      disabled={disabled}
                      onClick={() => handleToggle(emp, c.key)}
                      className={`inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-2 focus:outline-orange-500 focus:outline-offset-2 ${
                        checked ? "bg-orange-500" : "bg-slate-600"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          checked ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

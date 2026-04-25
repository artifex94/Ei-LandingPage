"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Empleado, Perfil } from "@/generated/prisma/client";
import { toggleEmpleadoActivo } from "@/lib/actions/empleados";

type EmpleadoConPerfil = Empleado & { perfil: Perfil };

const ROL_BADGE: Record<string, string> = {
  ADMIN_GENERAL: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  MONITOR:       "bg-blue-500/20 text-blue-300 border-blue-500/30",
  TECNICO:       "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ADMINISTRATIVO:"bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const ROL_LABEL: Record<string, string> = {
  ADMIN_GENERAL: "Admin",
  MONITOR:       "Monitor",
  TECNICO:       "Técnico",
  ADMINISTRATIVO:"Administrativo",
};

export function EmpleadosTable({
  empleados,
  basePath = "/admin/empleados",
}: {
  empleados: EmpleadoConPerfil[];
  rolLabel: Record<string, string>;
  basePath?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleToggle(id: string, activo: boolean) {
    setTogglingId(id);
    startTransition(async () => {
      await toggleEmpleadoActivo(id, !activo);
      setTogglingId(null);
    });
  }

  if (empleados.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
        <p className="text-slate-400">No hay empleados cargados todavía.</p>
        <p className="text-sm text-slate-500 mt-1">Usá el botón "Nuevo empleado" para agregar al equipo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 border-b border-slate-700">
          <tr>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Empleado</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Rol</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Capacidades</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Estado</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {empleados.map((emp) => (
            <tr key={emp.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: emp.color_calendario ?? "#6366f1" }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-white">{emp.perfil.nombre}</p>
                    <p className="text-xs text-slate-400">{emp.perfil.email ?? emp.perfil.telefono ?? "—"}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROL_BADGE[emp.rol_empleado] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
                  {ROL_LABEL[emp.rol_empleado] ?? emp.rol_empleado}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5 flex-wrap">
                  {emp.puede_monitorear && <Cap label="Monitoreo" />}
                  {emp.puede_instalar   && <Cap label="Instalación" />}
                  {emp.puede_facturar   && <Cap label="Facturación" />}
                  {!emp.puede_monitorear && !emp.puede_instalar && !emp.puede_facturar && (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${emp.activo ? "text-emerald-400" : "text-slate-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${emp.activo ? "bg-emerald-400" : "bg-slate-500"}`} aria-hidden="true" />
                  {emp.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`${basePath}/${emp.perfil_id}`}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleToggle(emp.id, emp.activo)}
                    disabled={pending && togglingId === emp.id}
                    className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    aria-label={emp.activo ? `Desactivar a ${emp.perfil.nombre}` : `Activar a ${emp.perfil.nombre}`}
                  >
                    {emp.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cap({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
      {label}
    </span>
  );
}

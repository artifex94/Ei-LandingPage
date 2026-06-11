"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import type { Empleado, Perfil } from "@/generated/prisma/client";
import { toggleEmpleadoActivo } from "@/lib/actions/empleados";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

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
  basePath = "/admin/trabajadores",
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

  const columns: Column<EmpleadoConPerfil>[] = [
    {
      id: "empleado",
      header: "Empleado",
      cell: (emp) => (
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: emp.color_calendario ?? "#64748b" }}
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-white">{emp.perfil.nombre}</p>
            <p className="text-xs text-slate-400">{emp.perfil.email ?? emp.perfil.telefono ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      id: "rol",
      header: "Rol",
      cell: (emp) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROL_BADGE[emp.rol_empleado] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
          {ROL_LABEL[emp.rol_empleado] ?? emp.rol_empleado}
        </span>
      ),
    },
    {
      id: "capacidades",
      header: "Capacidades",
      cell: (emp) => (
        <div className="flex gap-1.5 flex-wrap">
          {emp.puede_monitorear && <Cap label="Monitoreo" />}
          {emp.puede_instalar && <Cap label="Instalación" />}
          {emp.puede_facturar && <Cap label="Facturación" />}
          {!emp.puede_monitorear && !emp.puede_instalar && !emp.puede_facturar && (
            <span className="text-slate-500 text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: (emp) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${emp.activo ? "text-emerald-400" : "text-slate-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${emp.activo ? "bg-emerald-400" : "bg-slate-500"}`} aria-hidden="true" />
          {emp.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      cell: (emp) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`${basePath}/${emp.perfil_id}`}
            aria-label={`Editar a ${emp.perfil.nombre}`}
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
          >
            Editar
          </Link>
          <button
            onClick={() => handleToggle(emp.id, emp.activo)}
            disabled={pending && togglingId === emp.id}
            className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50 min-h-[44px] flex items-center"
            aria-label={emp.activo ? `Desactivar a ${emp.perfil.nombre}` : `Activar a ${emp.perfil.nombre}`}
          >
            {emp.activo ? "Desactivar" : "Activar"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={empleados}
      keyExtractor={(emp) => emp.id}
      caption="Listado de empleados"
      emptyState={
        <EmptyState
          icon={Users}
          title="No hay empleados cargados todavía."
          description='Usá el botón "Nuevo empleado" para agregar al equipo.'
        />
      }
    />
  );
}

function Cap({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
      {label}
    </span>
  );
}

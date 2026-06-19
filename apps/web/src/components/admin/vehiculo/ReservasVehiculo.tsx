"use client";

import { useTransition } from "react";
import type { Empleado, ReservaVehiculo } from "@/generated/prisma/client";
import { cambiarEstadoReserva } from "@/lib/actions/vehiculo";
import { DataTable, type Column } from "@/components/ui/DataTable";

type ReservaConEmpleado = ReservaVehiculo & { empleado: Empleado & { perfil: { nombre: string } } };

const ESTADO_BADGE: Record<string, string> = {
  RESERVADA:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  EN_USO:     "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  COMPLETADA: "bg-slate-700 text-slate-400 border-slate-600",
  CANCELADA:  "bg-red-500/20 text-red-300 border-red-500/30",
};
const ESTADO_LABEL: Record<string, string> = {
  RESERVADA:  "Reservada",
  EN_USO:     "En uso",
  COMPLETADA: "Completada",
  CANCELADA:  "Cancelada",
};

export function ReservasVehiculo({ reservas }: { reservas: ReservaConEmpleado[] }) {
  const [pending, startTransition] = useTransition();

  function handleEstado(id: string, estado: "EN_USO" | "COMPLETADA" | "CANCELADA") {
    startTransition(async () => {
      await cambiarEstadoReserva(id, estado);
    });
  }

  const fmt = (d: Date) =>
    new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const columns: Column<ReservaConEmpleado>[] = [
    {
      id: "empleado",
      header: "Empleado",
      cell: (r) => <span className="text-white font-medium">{r.empleado.perfil.nombre}</span>,
    },
    { id: "desde", header: "Desde", cell: (r) => <span className="text-slate-300">{fmt(r.desde)}</span> },
    { id: "hasta", header: "Hasta", cell: (r) => <span className="text-slate-300">{fmt(r.hasta)}</span> },
    {
      id: "estado",
      header: "Estado",
      cell: (r) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_BADGE[r.estado] ?? ""}`}>
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          {r.estado === "RESERVADA" && (
            <>
              <button
                onClick={() => handleEstado(r.id, "EN_USO")}
                disabled={pending}
                aria-label={`Marcar reserva de ${r.empleado.perfil.nombre} como en uso`}
                className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 min-h-[44px] flex items-center"
              >
                En uso
              </button>
              <button
                onClick={() => handleEstado(r.id, "CANCELADA")}
                disabled={pending}
                aria-label={`Cancelar reserva de ${r.empleado.perfil.nombre}`}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 min-h-[44px] flex items-center"
              >
                Cancelar
              </button>
            </>
          )}
          {r.estado === "EN_USO" && (
            <button
              onClick={() => handleEstado(r.id, "COMPLETADA")}
              disabled={pending}
              aria-label={`Completar reserva de ${r.empleado.perfil.nombre}`}
              className="text-xs text-slate-400 hover:text-white disabled:opacity-50 min-h-[44px] flex items-center"
            >
              Completar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={reservas}
      keyExtractor={(r) => r.id}
      caption="Reservas del vehículo"
      emptyState={<p className="text-sm text-slate-500 px-1">No hay reservas próximas.</p>}
    />
  );
}

"use client";

import { useTransition } from "react";
import type { Empleado, Perfil, ReservaVehiculo } from "@/generated/prisma/client";
import { cambiarEstadoReserva } from "@/lib/actions/vehiculo";

type ReservaConEmpleado = ReservaVehiculo & { empleado: Empleado & { perfil: Perfil } };

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

  if (reservas.length === 0) {
    return (
      <p className="text-sm text-slate-500 px-1">No hay reservas próximas.</p>
    );
  }

  function handleEstado(id: string, estado: "EN_USO" | "COMPLETADA" | "CANCELADA") {
    startTransition(async () => {
      await cambiarEstadoReserva(id, estado);
    });
  }

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 border-b border-slate-700">
          <tr>
            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Empleado</th>
            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Desde</th>
            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Hasta</th>
            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Estado</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {reservas.map((r) => (
            <tr key={r.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{r.empleado.perfil.nombre}</td>
              <td className="px-4 py-3 text-slate-300">
                {new Date(r.desde).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {new Date(r.hasta).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_BADGE[r.estado] ?? ""}`}>
                  {ESTADO_LABEL[r.estado] ?? r.estado}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {r.estado === "RESERVADA" && (
                    <>
                      <button
                        onClick={() => handleEstado(r.id, "EN_USO")}
                        disabled={pending}
                        className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                      >
                        En uso
                      </button>
                      <button
                        onClick={() => handleEstado(r.id, "CANCELADA")}
                        disabled={pending}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {r.estado === "EN_USO" && (
                    <button
                      onClick={() => handleEstado(r.id, "COMPLETADA")}
                      disabled={pending}
                      className="text-xs text-slate-400 hover:text-white disabled:opacity-50"
                    >
                      Completar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

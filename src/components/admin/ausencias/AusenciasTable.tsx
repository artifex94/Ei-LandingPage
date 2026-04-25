"use client";

import { useState, useTransition } from "react";
import { aprobarAusencia, eliminarAusencia } from "@/lib/actions/ausencias";
import { EditarAusenciaDialog } from "./EditarAusenciaDialog";
import type { Ausencia, Empleado, Perfil } from "@/generated/prisma/client";

type AusenciaConEmpleado = Ausencia & {
  empleado: Empleado & { perfil: Perfil };
};

export function AusenciasTable({
  ausencias,
  tipoLabel,
  hoyIso,
}: {
  ausencias: AusenciaConEmpleado[];
  tipoLabel: Record<string, string>;
  hoyIso: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hoy = new Date(hoyIso + "T00:00:00Z");

  if (ausencias.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
        <p className="text-slate-500">No hay ausencias registradas.</p>
      </div>
    );
  }

  function handleAprobar(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await aprobarAusencia(id);
      if (res?.error) setError(res.error);
    });
  }

  function handleEliminar(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await eliminarAusencia(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Empleado
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                Tipo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Período
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Estado
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {ausencias.map((a) => {
              const esActiva = new Date(a.hasta) >= hoy;
              const fmt = (d: Date) =>
                new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

              return (
                <tr key={a.id} className={`hover:bg-slate-800/40 transition-colors ${!esActiva ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{a.empleado.perfil.nombre}</p>
                    {a.notas && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{a.notas}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {tipoLabel[a.tipo] ?? a.tipo}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                    {fmt(a.desde)} — {fmt(a.hasta)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.aprobada ? (
                      <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                        Aprobada
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <EditarAusenciaDialog ausencia={a} nombreEmpleado={a.empleado.perfil.nombre} />
                      {!a.aprobada && (
                        <button
                          onClick={() => handleAprobar(a.id)}
                          disabled={pending}
                          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                        >
                          Aprobar
                        </button>
                      )}
                      <button
                        onClick={() => handleEliminar(a.id)}
                        disabled={pending}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { aprobarAusencia, eliminarAusencia } from "@/lib/actions/ausencias";
import { EditarAusenciaDialog } from "./EditarAusenciaDialog";
import type { Ausencia, Empleado } from "@/generated/prisma/client";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

type AusenciaConEmpleado = Ausencia & {
  empleado: Empleado & { perfil: { nombre: string } };
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

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

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

  const columns: Column<AusenciaConEmpleado>[] = [
    {
      id: "empleado",
      header: "Empleado",
      cell: (a) => (
        <>
          <p className="font-medium text-white">{a.empleado.perfil.nombre}</p>
          {a.notas && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.notas}</p>}
        </>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      className: "hidden sm:table-cell",
      cell: (a) => <span className="text-slate-400">{tipoLabel[a.tipo] ?? a.tipo}</span>,
    },
    {
      id: "periodo",
      header: "Período",
      cell: (a) => (
        <span className="text-slate-300 text-xs whitespace-nowrap">
          {fmt(a.desde)} — {fmt(a.hasta)}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      align: "center",
      cell: (a) =>
        a.aprobada ? (
          <Badge variant="success">Aprobada</Badge>
        ) : (
          <Badge variant="warning">Pendiente</Badge>
        ),
    },
    {
      id: "acciones",
      header: "Acciones",
      align: "center",
      cell: (a) => (
        <div className="flex items-center justify-center gap-2">
          <EditarAusenciaDialog ausencia={a} nombreEmpleado={a.empleado.perfil.nombre} />
          {!a.aprobada && (
            <button
              onClick={() => handleAprobar(a.id)}
              disabled={pending}
              aria-label={`Aprobar ausencia de ${a.empleado.perfil.nombre}`}
              className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors px-2 py-1.5 rounded min-h-[36px] flex items-center"
            >
              Aprobar
            </button>
          )}
          <button
            onClick={() => handleEliminar(a.id)}
            disabled={pending}
            aria-label={`Eliminar ausencia de ${a.empleado.perfil.nombre}`}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1.5 rounded min-h-[36px] flex items-center"
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <DataTable
        columns={columns}
        rows={ausencias}
        keyExtractor={(a) => a.id}
        caption="Ausencias registradas"
        rowClassName={(a) =>
          `hover:bg-slate-800/40 ${new Date(a.hasta) >= hoy ? "" : "opacity-50"}`
        }
        emptyState={
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <p className="text-slate-500">No hay ausencias registradas.</p>
          </div>
        }
      />
    </div>
  );
}

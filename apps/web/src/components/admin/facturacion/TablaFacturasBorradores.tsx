"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { Factura, FacturaItem, Perfil } from "@/generated/prisma/client";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalPrepararArca } from "./ModalPrepararArca";
import { ModalSubirPdf } from "./ModalSubirPdf";

type FacturaConRelaciones = Factura & {
  perfil: Pick<Perfil, "id" | "nombre">;
  items: Pick<FacturaItem, "id" | "descripcion" | "cantidad" | "precio_unit" | "subtotal">[];
};

export function TablaFacturasBorradores({ facturas }: { facturas: FacturaConRelaciones[] }) {
  const [preparando, setPreparando] = useState<FacturaConRelaciones | null>(null);
  const [subiendo,   setSubiendo]   = useState<FacturaConRelaciones | null>(null);

  const columns: Column<FacturaConRelaciones>[] = [
    {
      id: "titular",
      header: "Titular",
      cell: (f) => <p className="font-medium text-white">{f.razon_social_receptor ?? f.perfil.nombre}</p>,
    },
    {
      id: "cuit",
      header: "CUIT",
      cell: (f) => (
        <span className="text-slate-400 font-mono text-xs">
          {f.cuit_receptor ? formatCuit(f.cuit_receptor) : <span className="text-amber-400">Sin CUIT</span>}
        </span>
      ),
    },
    {
      id: "periodo",
      header: "Período",
      cell: (f) => (
        <span className="text-slate-300 text-xs">
          {new Date(f.periodo_desde).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </span>
      ),
    },
    {
      id: "cuentas",
      header: "Cuentas",
      cell: (f) => (
        <span className="text-slate-400 text-xs">
          {f.items.length} {f.items.length === 1 ? "cuenta" : "cuentas"}
        </span>
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (f) => (
        <span className="font-mono font-semibold text-white">${Number(f.total).toLocaleString("es-AR")}</span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      cell: (f) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setPreparando(f)}
            className="px-3 py-1.5 rounded-md bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-medium transition-colors"
          >
            Preparar para ARCA
          </button>
          <button
            onClick={() => setSubiendo(f)}
            className="px-3 py-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-medium transition-colors"
          >
            Subir PDF
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={facturas}
        keyExtractor={(f) => f.id}
        caption="Borradores de factura"
        emptyState={
          <EmptyState
            icon={FileText}
            title="No hay borradores pendientes."
            description='Usá el botón "Generar borradores" para crear los del mes actual.'
          />
        }
      />

      {preparando && (
        <ModalPrepararArca factura={preparando} onClose={() => setPreparando(null)} />
      )}
      {subiendo && (
        <ModalSubirPdf factura={subiendo} onClose={() => setSubiendo(null)} />
      )}
    </>
  );
}

function formatCuit(cuit: string) {
  // "20385573503" → "20-38557350-3"
  if (cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}

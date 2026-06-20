import { Receipt } from "lucide-react";
import type { Factura, FacturaItem, Perfil } from "@/generated/prisma/client";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

type FacturaConRelaciones = Factura & {
  perfil: Pick<Perfil, "id" | "nombre">;
  items: Pick<FacturaItem, "id" | "descripcion" | "cantidad" | "precio_unit" | "subtotal">[];
};

export function TablaFacturasEmitidas({ facturas }: { facturas: FacturaConRelaciones[] }) {
  const columns: Column<FacturaConRelaciones>[] = [
    {
      id: "numero",
      header: "Nº",
      cell: (f) => <span className="font-mono text-xs text-slate-300">{f.numero_oficial ?? "—"}</span>,
    },
    {
      id: "titular",
      header: "Titular",
      cell: (f) => <span className="font-medium text-white">{f.razon_social_receptor ?? f.perfil.nombre}</span>,
    },
    {
      id: "periodo",
      header: "Período",
      cell: (f) => (
        <span className="text-slate-400 text-xs capitalize">
          {new Date(f.periodo_desde).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </span>
      ),
    },
    {
      id: "emision",
      header: "Fecha emisión",
      className: "hidden sm:table-cell",
      cell: (f) => (
        <span className="text-slate-400 text-xs">
          {f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString("es-AR") : "—"}
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
      cell: (f) =>
        f.pdf_url ? (
          <a
            href={f.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            Ver PDF ↗
          </a>
        ) : (
          <span className="text-xs text-slate-500">Sin PDF</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={facturas}
      keyExtractor={(f) => f.id}
      caption="Facturas emitidas"
      emptyState={<EmptyState icon={Receipt} title="No hay facturas emitidas todavía." />}
    />
  );
}

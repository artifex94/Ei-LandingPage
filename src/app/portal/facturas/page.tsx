import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Mis facturas" };

export default async function FacturasPortalPage() {
  const { userId } = await requireSesion();

  const facturas = await prisma.factura.findMany({
    where: {
      perfil_id: userId,
      estado:    { in: ["EMITIDA_MANUAL", "EMITIDA_WSFE"] },
    },
    orderBy: { periodo_desde: "desc" },
    take: 60,
  });

  type FacturaRow = (typeof facturas)[number];

  const fmtPeriodo = (d: Date) =>
    new Date(d).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const columns: Column<FacturaRow>[] = [
    {
      id: "periodo",
      header: "Período",
      cell: (f) => <span className="text-white capitalize">{fmtPeriodo(f.periodo_desde)}</span>,
    },
    {
      id: "numero",
      header: "Nº",
      cell: (f) => <span className="font-mono text-xs text-slate-400">{f.numero_oficial ?? "—"}</span>,
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (f) => <span className="font-semibold text-white">${Number(f.total).toLocaleString("es-AR")}</span>,
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
            aria-label={`Descargar factura de ${fmtPeriodo(f.periodo_desde)}`}
          >
            Descargar PDF ↗
          </a>
        ) : (
          <span className="text-xs text-slate-500">Próximamente</span>
        ),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis facturas</h1>
        <p className="text-sm text-slate-400 mt-1">
          Facturas emitidas por Escobar Instalaciones disponibles para descarga.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={facturas}
        keyExtractor={(f) => f.id}
        caption="Mis facturas"
        emptyState={<EmptyState icon={Receipt} title="No hay facturas disponibles todavía." />}
      />
    </div>
  );
}

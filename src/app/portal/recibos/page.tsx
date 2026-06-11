import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { METODO_LABEL } from "@/lib/constants/payment";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Mis recibos" };

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default async function RecibosPortalPage() {
  const { userId } = await requireSesion();

  const pagos = await prisma.pago.findMany({
    where: {
      estado: "PAGADO",
      cuenta: { perfil_id: userId },
    },
    include: {
      cuenta: { select: { descripcion: true } },
    },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
    take: 120,
  });

  type ReciboRow = (typeof pagos)[number];

  const columns: Column<ReciboRow>[] = [
    {
      id: "periodo",
      header: "Período",
      cell: (p) => <span className="text-white capitalize">{MESES_ES[p.mes - 1]} {p.anio}</span>,
    },
    {
      id: "servicio",
      header: "Servicio",
      cell: (p) => <span className="text-slate-400 text-xs">{p.cuenta.descripcion}</span>,
    },
    {
      id: "importe",
      header: "Importe",
      align: "right",
      cell: (p) => (
        <span className="font-semibold text-white">
          ${Number(p.importe).toLocaleString("es-AR")}
          {p.metodo && (
            <span className="block text-xs font-normal text-slate-500">
              {METODO_LABEL[p.metodo] ?? p.metodo}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      cell: (p) => (
        <Link
          href={`/recibo/${p.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          aria-label={`Ver recibo de ${MESES_ES[p.mes - 1]} ${p.anio}`}
        >
          Ver recibo ↗
        </Link>
      ),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Mis recibos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Comprobantes de pago de todos tus servicios.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={pagos}
        keyExtractor={(p) => p.id}
        caption="Mis recibos de pago"
        emptyState={<EmptyState icon={Receipt} title="No hay pagos registrados todavía." />}
      />
    </div>
  );
}

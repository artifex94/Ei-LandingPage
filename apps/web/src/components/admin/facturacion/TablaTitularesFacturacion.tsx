"use client";

import { useTransition } from "react";
import { FileText } from "lucide-react";
import type { CondicionIVA } from "@/generated/prisma/client";
import { toggleRequiereFactura } from "@/lib/actions/facturacion";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

export type TitularFacturacion = {
  id: string;
  nombre: string;
  cuit: string | null;
  razon_social: string | null;
  condicion_iva: CondicionIVA | null;
  requiere_factura: boolean;
};

export function TablaTitularesFacturacion({
  titulares,
}: {
  titulares: TitularFacturacion[];
}) {
  const [pending, startTransition] = useTransition();

  function handleToggle(id: string, valorActual: boolean) {
    startTransition(() => toggleRequiereFactura(id, !valorActual));
  }

  const conFactura  = titulares.filter((t) => t.requiere_factura);
  const sinFactura  = titulares.filter((t) => !t.requiere_factura);

  const columns: Column<TitularFacturacion>[] = [
    {
      id: "titular",
      header: "Titular",
      cell: (t) => <span className="font-medium text-white">{t.nombre}</span>,
    },
    {
      id: "cuit",
      header: "CUIT",
      className: "hidden sm:table-cell",
      cell: (t) => (
        <span className="font-mono text-xs text-slate-300">
          {t.cuit ?? (
            <span className={t.requiere_factura ? "text-amber-400" : "text-slate-500"}>
              {t.requiere_factura ? "⚠ Sin CUIT" : "—"}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "razon",
      header: "Razón social",
      className: "hidden sm:table-cell",
      cell: (t) => (
        <span className="text-slate-400 text-xs">
          {t.razon_social ?? <span className="text-slate-500">—</span>}
        </span>
      ),
    },
    {
      id: "factura",
      header: "Factura",
      align: "center",
      cell: (t) => (
        <button
          onClick={() => handleToggle(t.id, t.requiere_factura)}
          disabled={pending}
          aria-label={t.requiere_factura ? `Quitar factura a ${t.nombre}` : `Activar factura para ${t.nombre}`}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
            t.requiere_factura ? "bg-orange-500" : "bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              t.requiere_factura ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        <strong className="text-white">{conFactura.length}</strong> titular{conFactura.length !== 1 ? "es" : ""} con factura ·{" "}
        <strong className="text-white">{sinFactura.length}</strong> con recibo solamente.
      </p>

      <DataTable
        columns={columns}
        rows={titulares}
        keyExtractor={(t) => t.id}
        caption="Titulares y configuración de facturación"
        emptyState={<EmptyState icon={FileText} title="No hay titulares con cuentas activas." />}
      />
    </div>
  );
}

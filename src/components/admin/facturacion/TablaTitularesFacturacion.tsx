"use client";

import { useTransition } from "react";
import type { CondicionIVA } from "@/generated/prisma/client";
import { toggleRequiereFactura } from "@/lib/actions/facturacion";

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

  if (titulares.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
        <p className="text-slate-400">No hay titulares con cuentas activas.</p>
      </div>
    );
  }

  const conFactura  = titulares.filter((t) => t.requiere_factura);
  const sinFactura  = titulares.filter((t) => !t.requiere_factura);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        <strong className="text-white">{conFactura.length}</strong> titular{conFactura.length !== 1 ? "es" : ""} con factura ·{" "}
        <strong className="text-white">{sinFactura.length}</strong> con recibo solamente.
      </p>

      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Titular</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">CUIT</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Razón social</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Factura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {titulares.map((t) => (
              <tr key={t.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{t.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">
                  {t.cuit ?? (
                    <span className={t.requiere_factura ? "text-amber-400" : "text-slate-500"}>
                      {t.requiere_factura ? "⚠ Sin CUIT" : "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {t.razon_social ?? <span className="text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(t.id, t.requiere_factura)}
                    disabled={pending}
                    aria-label={t.requiere_factura ? `Quitar factura a ${t.nombre}` : `Activar factura para ${t.nombre}`}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
                      t.requiere_factura ? "bg-indigo-600" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        t.requiere_factura ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

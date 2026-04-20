"use client";

import { useState } from "react";
import type { Factura, FacturaItem, Perfil } from "@/generated/prisma/client";
import { ModalPrepararArca } from "./ModalPrepararArca";
import { ModalSubirPdf } from "./ModalSubirPdf";

type FacturaConRelaciones = Factura & { perfil: Perfil; items: FacturaItem[] };

export function TablaFacturasBorradores({ facturas }: { facturas: FacturaConRelaciones[] }) {
  const [preparando, setPreparando] = useState<FacturaConRelaciones | null>(null);
  const [subiendo,   setSubiendo]   = useState<FacturaConRelaciones | null>(null);

  if (facturas.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
        <p className="text-slate-400">No hay borradores pendientes.</p>
        <p className="text-sm text-slate-500 mt-1">
          Usá el botón "Generar borradores" para crear los del mes actual.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Titular</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">CUIT</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Período</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Cuentas</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {facturas.map((f) => (
              <tr key={f.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">
                    {f.razon_social_receptor ?? f.perfil.nombre}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                  {f.cuit_receptor ? (
                    formatCuit(f.cuit_receptor)
                  ) : (
                    <span className="text-amber-400">Sin CUIT</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">
                  {new Date(f.periodo_desde).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {f.items.length} {f.items.length === 1 ? "cuenta" : "cuentas"}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                  ${Number(f.total).toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setPreparando(f)}
                      className="px-3 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium transition-colors"
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

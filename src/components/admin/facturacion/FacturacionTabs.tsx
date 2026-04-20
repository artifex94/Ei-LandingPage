"use client";

import { useState } from "react";
import type { Factura, FacturaItem, Perfil } from "@/generated/prisma/client";
import { TablaFacturasBorradores } from "./TablaFacturasBorradores";
import { TablaFacturasEmitidas } from "./TablaFacturasEmitidas";
import { TablaTitularesFacturacion, type TitularFacturacion } from "./TablaTitularesFacturacion";

type FacturaConRelaciones = Factura & { perfil: Perfil; items: FacturaItem[] };

const TABS = [
  { key: "borradores", label: "Borradores" },
  { key: "emitidas",   label: "Emitidas" },
  { key: "titulares",  label: "Titulares" },
] as const;

type Tab = typeof TABS[number]["key"];

export function FacturacionTabs({
  borradores,
  emitidas,
  titulares,
}: {
  borradores: FacturaConRelaciones[];
  emitidas:   FacturaConRelaciones[];
  titulares:  TitularFacturacion[];
}) {
  const [tab, setTab] = useState<Tab>("borradores");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-700" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.key === "borradores" && borradores.length > 0 && (
              <span className="ml-2 text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                {borradores.length}
              </span>
            )}
            {t.key === "titulares" && (
              <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">
                {titulares.filter((t) => t.requiere_factura).length}/{titulares.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "borradores" && <TablaFacturasBorradores facturas={borradores} />}
      {tab === "emitidas"   && <TablaFacturasEmitidas   facturas={emitidas} />}
      {tab === "titulares"  && <TablaTitularesFacturacion titulares={titulares} />}
    </div>
  );
}

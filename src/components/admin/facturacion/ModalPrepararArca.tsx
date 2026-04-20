"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Factura, FacturaItem, Perfil } from "@/generated/prisma/client";

type FacturaConRelaciones = Factura & { perfil: Perfil; items: FacturaItem[] };

const COND_IVA_LABEL: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: "IVA Responsable Inscripto",
  MONOTRIBUTISTA:        "Responsable Monotributo",
  EXENTO:                "IVA Exento",
  CONSUMIDOR_FINAL:      "Consumidor Final",
  NO_RESPONSABLE:        "No Responsable",
};

function formatCuit(cuit: string) {
  if (cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}

export function ModalPrepararArca({
  factura,
  onClose,
}: {
  factura: FacturaConRelaciones;
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const periodo = new Date(factura.periodo_desde).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const periodoDesde = new Date(factura.periodo_desde).toLocaleDateString("es-AR");
  const periodoHasta = new Date(factura.periodo_hasta).toLocaleDateString("es-AR");
  const vto          = factura.fecha_vto_pago
    ? new Date(factura.fecha_vto_pago).toLocaleDateString("es-AR")
    : "—";

  // Texto formateado para pegar en ARCA
  const textoArca = [
    `Tipo: Factura C (COD. 011)`,
    `Punto de Venta: 00001`,
    ``,
    `── EMISOR ──────────────────────────`,
    `Razón Social: ${factura.razon_social_emisor}`,
    `CUIT: ${formatCuit(factura.cuit_emisor)}`,
    `Condición IVA: Responsable Monotributo`,
    ``,
    `── RECEPTOR ────────────────────────`,
    `Apellido/Razón Social: ${factura.razon_social_receptor ?? factura.perfil.nombre}`,
    `CUIT: ${factura.cuit_receptor ? formatCuit(factura.cuit_receptor) : "— COMPLETAR —"}`,
    `Condición IVA: ${COND_IVA_LABEL[factura.condicion_iva_receptor] ?? factura.condicion_iva_receptor}`,
    ``,
    `── COMPROBANTE ──────────────────────`,
    `Período facturado desde: ${periodoDesde}`,
    `Período facturado hasta: ${periodoHasta}`,
    `Fecha de vto. de pago: ${vto}`,
    `Condición de venta: Contado`,
    ``,
    `── DETALLE ──────────────────────────`,
    ...factura.items.map(
      (it) =>
        `${it.descripcion} — cant: ${it.cantidad} — precio: $${Number(it.precio_unit).toLocaleString("es-AR")} — subtotal: $${Number(it.subtotal).toLocaleString("es-AR")}`
    ),
    ``,
    `Subtotal: $${Number(factura.subtotal).toLocaleString("es-AR")}`,
    `Importe Otros Tributos: $0,00`,
    `Importe Total: $${Number(factura.total).toLocaleString("es-AR")}`,
  ].join("\n");

  function copiarAlPortapapeles() {
    navigator.clipboard.writeText(textoArca).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="arca-desc"
        >
          <Dialog.Title className="text-lg font-semibold text-white mb-1">
            Preparar para ARCA
          </Dialog.Title>
          <Dialog.Description id="arca-desc" className="text-sm text-slate-400 mb-5">
            {factura.razon_social_receptor ?? factura.perfil.nombre} — {periodo}
          </Dialog.Description>

          {!factura.cuit_receptor && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <span className="text-amber-400 mt-0.5" aria-hidden="true">⚠</span>
              <p className="text-xs text-amber-300">
                Este titular no tiene CUIT cargado. Completalo en{" "}
                <a href="/admin/clientes" className="underline">Clientes</a> antes de emitir.
              </p>
            </div>
          )}

          {/* Texto para copiar */}
          <pre className="rounded-lg bg-slate-800 border border-slate-700 p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed mb-4 select-all">
            {textoArca}
          </pre>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copiarAlPortapapeles}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                copiado
                  ? "bg-emerald-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {copiado ? "¡Copiado!" : "Copiar al portapapeles"}
            </button>

            <a
              href="https://auth.afip.gob.ar/contribuyente/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 text-sm font-medium text-center transition-colors"
            >
              Abrir ARCA ↗
            </a>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            1. Copiá los datos · 2. Emití en ARCA · 3. Descargá el PDF · 4. Volvé y subí el PDF con "Subir PDF"
          </p>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

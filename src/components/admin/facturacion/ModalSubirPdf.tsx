"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Factura, FacturaItem, Perfil } from "@/generated/prisma/client";
import { marcarEmitidaManual } from "@/lib/actions/facturacion";

type FacturaConRelaciones = Factura & { perfil: Perfil; items: FacturaItem[] };

export function ModalSubirPdf({
  factura,
  onClose,
}: {
  factura: FacturaConRelaciones;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const numero = fd.get("numero_oficial") as string;

    if (!numero.trim()) { setError("El número de comprobante es obligatorio."); return; }
    if (!archivo)       { setError("Seleccioná el PDF de la factura."); return; }

    // Validar formato número: "00001-00000048"
    if (!/^\d{5}-\d{8}$/.test(numero.trim())) {
      setError('Formato incorrecto. Debe ser "00001-00000048".');
      return;
    }

    const pdfForm = new FormData();
    pdfForm.set("pdf", archivo);

    startTransition(async () => {
      try {
        await marcarEmitidaManual(factura.id, numero.trim(), pdfForm);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  const periodo = new Date(factura.periodo_desde).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          aria-describedby="subir-pdf-desc"
        >
          <Dialog.Title className="text-lg font-semibold text-white mb-1">
            Subir PDF emitido
          </Dialog.Title>
          <Dialog.Description id="subir-pdf-desc" className="text-sm text-slate-400 mb-5">
            {factura.razon_social_receptor ?? factura.perfil.nombre} — {periodo}
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="numero_oficial" className="block text-sm font-medium text-slate-300 mb-1">
                Número de comprobante <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <input
                id="numero_oficial"
                name="numero_oficial"
                type="text"
                placeholder="00001-00000048"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Formato: punto de venta (5 dígitos) - número (8 dígitos)
              </p>
            </div>

            <div>
              <label htmlFor="pdf_input" className="block text-sm font-medium text-slate-300 mb-1">
                PDF de la factura <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <input
                id="pdf_input"
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-indigo-600/20 file:text-indigo-300 file:text-sm hover:file:bg-indigo-600/40 cursor-pointer"
              />
              {archivo && (
                <p className="text-xs text-emerald-400 mt-1">
                  ✓ {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {pending ? "Subiendo…" : "Confirmar emisión"}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors" aria-label="Cerrar">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

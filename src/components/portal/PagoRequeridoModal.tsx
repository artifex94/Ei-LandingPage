"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";

/**
 * Hard Paywall Modal — PDF PRD §2.3 (estado SUSPENDED)
 *
 * Se muestra cuando al menos una cuenta del cliente está SUSPENDIDA_PAGO
 * o lleva ≥15 días de mora. NO es dismissable.
 */
interface Props {
  deudaTotal: number;
}

export function PagoRequeridoModal({ deudaTotal }: Props) {
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-red-800 rounded-2xl p-6 shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-describedby="paywall-desc"
        >
          {/* Ícono de alerta */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-900/50 border border-red-700 flex items-center justify-center text-2xl">
              ⚠
            </div>
          </div>

          <Dialog.Title className="text-xl font-bold text-white text-center mb-2">
            Servicio suspendido por falta de pago
          </Dialog.Title>

          <p id="paywall-desc" className="text-slate-300 text-center text-sm mb-6">
            Tu servicio de monitoreo está momentáneamente suspendido. Para reactivarlo regularizá
            el pago de los períodos adeudados.
          </p>

          {deudaTotal > 0 && (
            <p className="text-center mb-6">
              <span className="text-slate-400 text-sm">Deuda total: </span>
              <span className="text-white font-bold text-2xl">
                ${deudaTotal.toLocaleString("es-AR")}
              </span>
            </p>
          )}

          <Link
            href="/portal/pagos"
            className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl min-h-[48px] transition-colors text-base leading-tight flex items-center justify-center"
          >
            Pagar ahora y reactivar servicio
          </Link>

          <p className="text-xs text-slate-500 text-center mt-4">
            Si ya realizaste un pago aguardá la confirmación o contactá a{" "}
            <a
              href="https://wa.me/5493436575372"
              className="text-orange-400 underline"
            >
              Escobar Instalaciones
            </a>
            .
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

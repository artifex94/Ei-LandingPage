"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";
import type { PagoPlano } from "@/components/portal/CalendarioPagos";
import { crearPreferenciaMercadoPago, crearIntencionTalo } from "@/app/portal/pagos/actions";

interface Props {
  pago: PagoPlano;
  cuentaId: string;
  nombreMes: string;
  onClose: () => void;
}

export function PagoModal({ pago, cuentaId, nombreMes, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [taloDatos, setTaloDatos] = useState<{
    cvu: string;
    alias: string;
    importe: string;
  } | null>(null);

  function handleMercadoPago() {
    setError("");
    startTransition(async () => {
      const result = await crearPreferenciaMercadoPago(
        cuentaId,
        pago.mes,
        pago.anio
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        window.location.href = result.checkoutUrl;
      }
    });
  }

  function handleTalo() {
    setError("");
    startTransition(async () => {
      const result = await crearIntencionTalo(cuentaId, pago.mes, pago.anio);
      if ("error" in result) {
        setError(result.error);
      } else {
        setTaloDatos({
          cvu: result.cvu,
          alias: result.alias,
          importe: Number(pago.importe).toLocaleString("es-AR"),
        });
      }
    });
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
          aria-describedby="pago-desc"
        >
          <Dialog.Title className="text-xl font-bold text-white mb-1">
            Pagar {nombreMes} {pago.anio}
          </Dialog.Title>
          <p id="pago-desc" className="text-slate-400 text-sm mb-6">
            Importe:{" "}
            <strong className="text-white text-lg">
              ${Number(pago.importe).toLocaleString("es-AR")}
            </strong>
          </p>

          {error && (
            <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {!taloDatos ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleMercadoPago}
                disabled={isPending}
                className="w-full bg-[#009ee3] hover:bg-[#0082c0] disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-4 min-h-[56px] text-base transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? "Procesando..." : "Pagar con Mercado Pago"}
              </button>

              <button
                onClick={handleTalo}
                disabled={isPending}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-4 min-h-[56px] text-base transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? "Generando..." : "Transferencia bancaria (CVU)"}
              </button>

              <button
                onClick={onClose}
                className="w-full text-slate-500 hover:text-slate-700 py-2 min-h-[44px] text-sm"
              >
                Cancelar
              </button>
            </div>
          ) : (
            /* Vista CVU de Talo — caracteres grandes para legibilidad */
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-5 border border-slate-600">
                <p className="text-sm font-medium text-slate-400 mb-1">
                  Importe a transferir
                </p>
                <p className="text-3xl font-bold text-white" aria-live="polite">
                  ${taloDatos.importe}
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-xl p-5 border border-slate-600">
                <p className="text-sm font-medium text-slate-400 mb-1">CVU</p>
                <p
                  className="text-xl font-mono font-semibold text-white break-all"
                  aria-label={`CVU: ${taloDatos.cvu}`}
                >
                  {taloDatos.cvu}
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-xl p-5 border border-slate-600">
                <p className="text-sm font-medium text-slate-400 mb-1">Alias</p>
                <p className="text-xl font-semibold text-white">
                  {taloDatos.alias}
                </p>
              </div>

              <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 text-sm text-amber-300">
                Una vez realizada la transferencia, el estado se actualizará
                automáticamente en minutos.
              </div>

              <button
                onClick={onClose}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-3 min-h-[48px] text-base"
              >
                Listo, ya transferí
              </button>
            </div>
          )}

          <Dialog.Close className="absolute top-4 right-4 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors">
            <span aria-hidden="true" className="text-xl">✕</span>
            <span className="sr-only">Cerrar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

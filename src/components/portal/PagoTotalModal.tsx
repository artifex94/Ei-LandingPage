"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";
import type { PagoPlano } from "@/components/portal/CalendarioPagos";
import {
  crearPreferenciaTodoMP,
  avisarTransferenciaTodo,
} from "@/app/portal/pagos/actions";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface DeudaItem {
  pago: PagoPlano;
  descripcionCuenta: string;
}

interface Props {
  deudas: DeudaItem[];
  onClose: () => void;
}

function CopyButton({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }
  return (
    <button
      onClick={copiar}
      type="button"
      className="shrink-0 text-sm bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-md transition-colors min-h-[44px] min-w-[80px]"
    >
      {copiado ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

function CampoCopia({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-400 mb-2">{etiqueta}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono font-bold text-white break-all text-base">
          {valor}
        </span>
        <CopyButton texto={valor} />
      </div>
    </div>
  );
}

export function PagoTotalModal({ deudas, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmarAccion, setConfirmarAccion] = useState<"mp" | "transferencia" | null>(null);
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [refCodes, setRefCodes] = useState<string[]>([]);
  const [enviado, setEnviado] = useState(false);

  const total = deudas.reduce((s, d) => s + d.pago.importe, 0);
  const totalStr = `$${total.toLocaleString("es-AR")}`;
  const pagoIds = deudas.map((d) => d.pago.id);

  const cvu = process.env.NEXT_PUBLIC_BUSINESS_CVU ?? "";
  const alias = process.env.NEXT_PUBLIC_BUSINESS_ALIAS ?? "";

  function handleMercadoPago() {
    setError("");
    startTransition(async () => {
      const result = await crearPreferenciaTodoMP(pagoIds);
      if ("error" in result) {
        setError(result.error);
      } else {
        window.location.href = result.checkoutUrl;
      }
    });
  }

  function handleYaTransferi() {
    setError("");
    startTransition(async () => {
      const result = await avisarTransferenciaTodo(pagoIds);
      if ("error" in result) {
        setError(result.error);
      } else {
        setRefCodes(result.refCodes);
        setEnviado(true);
      }
    });
  }

  // ── Vista: confirmación de acción ──────────────────────────────────────────
  if (confirmarAccion === "mp") {
    return (
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6"
            aria-describedby="confirm-mp-desc"
          >
            <Dialog.Title className="text-xl font-bold text-white mb-4">
              ¿Confirmar pago?
            </Dialog.Title>
            <p id="confirm-mp-desc" className="text-slate-300 text-base mb-2">
              Vas a ser redirigido a Mercado Pago para pagar:
            </p>
            <p className="text-3xl font-bold text-white mb-6">{totalStr}</p>
            <p className="text-slate-400 text-sm mb-6">
              Incluye {deudas.length} servicio{deudas.length !== 1 ? "s" : ""}.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleMercadoPago}
                disabled={isPending}
                className="w-full bg-[#009ee3] hover:bg-[#0082c0] disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
              >
                {isPending ? "Conectando con Mercado Pago…" : "Sí, ir a pagar"}
              </button>
              <button
                onClick={() => setConfirmarAccion(null)}
                disabled={isPending}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl px-5 py-4 min-h-[56px] text-base transition-colors"
              >
                Volver
              </button>
            </div>
            {error && (
              <div role="alert" className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg px-4 py-3 text-sm mt-4">
                {error}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  if (confirmarAccion === "transferencia") {
    return (
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6"
            aria-describedby="confirm-transf-desc"
          >
            <Dialog.Title className="text-xl font-bold text-white mb-4">
              ¿Confirmar transferencia?
            </Dialog.Title>
            <p id="confirm-transf-desc" className="text-slate-300 text-base mb-2">
              Vas a avisarnos que transferiste el pago total de:
            </p>
            <p className="text-3xl font-bold text-white mb-6">{totalStr}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setConfirmarAccion(null); setMostrarTransferencia(true); }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
              >
                Ver instrucciones de transferencia
              </button>
              <button
                onClick={() => setConfirmarAccion(null)}
                className="w-full text-slate-500 hover:text-slate-400 py-3 min-h-[48px] text-base"
              >
                Volver
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // ── Vista: éxito transferencia ─────────────────────────────────────────────
  const vistaExitoTransferencia = (
    <div className="space-y-5 text-center">
      <div className="text-6xl mt-2">✓</div>
      <p className="text-white font-bold text-xl">
        ¡Gracias! Ya avisamos que vas a transferir.
      </p>
      <p className="text-slate-400 text-base">
        En cuanto verifiquemos el pago, vamos a confirmar cada servicio.
      </p>
      {refCodes.length > 0 && (
        <div className="text-left space-y-2 mt-2">
          <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">
            Códigos de referencia usados:
          </p>
          {refCodes.map((ref) => (
            <div key={ref} className="bg-slate-700/50 rounded-lg px-3 py-2 font-mono text-sm text-white">
              {ref}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onClose}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg mt-4"
      >
        Cerrar
      </button>
    </div>
  );

  // ── Vista: instrucciones de transferencia ──────────────────────────────────
  const importesPorCuenta = deudas.map((d) => {
    const mesLabel = MESES[d.pago.mes];
    return `${d.descripcionCuenta} (${mesLabel} ${d.pago.anio}): $${d.pago.importe.toLocaleString("es-AR")}`;
  });
  const importeResumen = importesPorCuenta.join(", ");

  const vistaTransferencia = enviado ? vistaExitoTransferencia : (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          Paso 1 — Hacé la transferencia
        </p>
        <div className="space-y-2">
          <CampoCopia etiqueta="CVU" valor={cvu || "Consultá al equipo de Escobar Instalaciones"} />
          <CampoCopia etiqueta="Alias" valor={alias || "Consultá al equipo de Escobar Instalaciones"} />
          <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 mb-1">Importe total a transferir</p>
            <p className="text-3xl font-bold text-white">{totalStr}</p>
            <p className="text-xs text-slate-400 mt-2">{importeResumen}</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          Paso 2 — Muy importante
        </p>
        <p className="text-sm text-amber-200">
          En el campo <strong>"Concepto"</strong> o <strong>"Referencia"</strong> de tu banco escribí:
        </p>
        <p className="font-mono font-bold text-white mt-2 text-base">PAGO TOTAL — {deudas.length} servicios</p>
        <p className="text-xs text-amber-300 mt-2">
          Esto nos ayuda a identificar tu pago. Si querés podés mencionar tu nombre también.
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          Paso 3 — Avisanos cuando termines
        </p>
        <button
          onClick={handleYaTransferi}
          disabled={isPending}
          className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
        >
          {isPending ? "Registrando…" : "✓ Ya hice la transferencia"}
        </button>
        <p className="text-sm text-slate-400 text-center mt-2">
          Tocá este botón después de completar la transferencia.
        </p>
      </div>

      <button
        onClick={() => setMostrarTransferencia(false)}
        className="w-full text-slate-400 hover:text-white py-3 min-h-[48px] text-base"
      >
        ← Volver a las opciones de pago
      </button>
    </div>
  );

  // ── Vista principal: selección de método ───────────────────────────────────
  const vistaOpciones = (
    <div className="space-y-4">
      {/* Lista de deudas */}
      <div className="bg-slate-700/40 rounded-xl p-4 space-y-2">
        {deudas.map((d) => (
          <div key={d.pago.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300 min-w-0 truncate">
              {d.descripcionCuenta} — {MESES[d.pago.mes]} {d.pago.anio}
            </span>
            <span className="text-white font-semibold shrink-0">
              ${d.pago.importe.toLocaleString("es-AR")}
            </span>
          </div>
        ))}
        <div className="border-t border-slate-600 pt-2 flex items-center justify-between">
          <span className="text-slate-300 font-semibold">Total</span>
          <span className="text-white font-bold text-xl">{totalStr}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setConfirmarAccion("mp")}
          disabled={isPending}
          className="w-full bg-[#009ee3] hover:bg-[#0082c0] disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
        >
          Pagar con Mercado Pago
        </button>

        <button
          onClick={() => setConfirmarAccion("transferencia")}
          disabled={isPending}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
        >
          Transferencia bancaria (CBU/CVU)
        </button>

        <button
          onClick={onClose}
          className="w-full text-slate-400 hover:text-white py-3 min-h-[48px] text-base mt-1"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
          aria-describedby="pago-total-desc"
        >
          <Dialog.Title className="text-xl font-bold text-white mb-1">
            Regularizar tus pagos
          </Dialog.Title>
          <p id="pago-total-desc" className="text-slate-400 text-sm mb-5">
            {deudas.length} {deudas.length === 1 ? "pago por atender" : "pagos por atender"}
          </p>

          {error && (
            <div role="alert" className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {mostrarTransferencia ? vistaTransferencia : vistaOpciones}

          <Dialog.Close className="absolute top-4 right-4 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors">
            <span aria-hidden="true" className="text-xl">✕</span>
            <span className="sr-only">Cerrar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";
import type { PagoPlano } from "@/components/portal/CalendarioPagos";
import {
  crearPreferenciaMercadoPago,
  crearIntencionTalo,
  avisarTransferencia,
} from "@/app/portal/pagos/actions";

interface Props {
  pago: PagoPlano;
  cuentaId: string;
  nombreMes: string;
  onClose: () => void;
}

// ── Botón de copiar al portapapeles ──────────────────────────────────────────
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
      className="shrink-0 text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded-md transition-colors min-h-[32px] min-w-[64px]"
    >
      {copiado ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

// ── Campo de dato copiable ────────────────────────────────────────────────────
function CampoCopia({
  etiqueta,
  valor,
  grande = false,
}: {
  etiqueta: string;
  valor: string;
  grande?: boolean;
}) {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-400 mb-2">{etiqueta}</p>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`font-mono font-bold text-white break-all ${
            grande ? "text-xl" : "text-base"
          }`}
        >
          {valor}
        </span>
        <CopyButton texto={valor} />
      </div>
    </div>
  );
}

export function PagoModal({ pago, cuentaId, nombreMes, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [taloUrl, setTaloUrl] = useState<string | null>(null);
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [transferenciaEnviada, setTransferenciaEnviada] = useState(false);
  const [confirmarMP, setConfirmarMP] = useState(false);

  // Código de referencia único — el mismo que guarda el servidor
  const refCode = `EI-${pago.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const importeStr = `$${Number(pago.importe).toLocaleString("es-AR")}`;

  const cvu = process.env.NEXT_PUBLIC_BUSINESS_CVU ?? "";
  const alias = process.env.NEXT_PUBLIC_BUSINESS_ALIAS ?? "";

  function handleMercadoPago() {
    setError("");
    startTransition(async () => {
      const result = await crearPreferenciaMercadoPago(cuentaId, pago.mes, pago.anio);
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
        setTaloUrl(result.paymentUrl);
      }
    });
  }

  function handleYaTransferi() {
    setError("");
    startTransition(async () => {
      const result = await avisarTransferencia(cuentaId, pago.mes, pago.anio);
      if ("error" in result) {
        setError(result.error);
      } else {
        setTransferenciaEnviada(true);
      }
    });
  }

  // ── Vista: confirmación de Mercado Pago ────────────────────────────────────
  const vistaConfirmarMP = (
    <div className="space-y-5">
      <div className="bg-slate-700/40 rounded-xl p-4 text-center">
        <p className="text-slate-300 text-base mb-1">Vas a pagar</p>
        <p className="text-3xl font-bold text-white">{importeStr}</p>
        <p className="text-slate-400 text-sm mt-1">{nombreMes} {pago.anio}</p>
      </div>
      <p className="text-slate-300 text-base text-center">
        Serás redirigido a Mercado Pago para completar el pago.
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={handleMercadoPago}
          disabled={isPending}
          className="w-full bg-[#009ee3] hover:bg-[#0082c0] disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
        >
          {isPending ? "Conectando…" : "Sí, ir a pagar"}
        </button>
        <button
          onClick={() => setConfirmarMP(false)}
          disabled={isPending}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl px-5 py-4 min-h-[56px] text-base transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  );

  // ── Vista: selección de método ──────────────────────────────────────────────
  const vistaOpciones = (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setConfirmarMP(true)}
        disabled={isPending}
        className="w-full bg-[#009ee3] hover:bg-[#0082c0] disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
      >
        Pagar con Mercado Pago
      </button>

      <button
        onClick={() => setMostrarTransferencia(true)}
        disabled={isPending}
        className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[60px] text-lg transition-colors"
      >
        Transferencia bancaria (CBU/CVU)
      </button>

      <button
        onClick={handleTalo}
        disabled={isPending}
        className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-4 min-h-[56px] text-base transition-colors"
      >
        {isPending ? "Generando enlace..." : "Pagar con cripto (Talo)"}
      </button>

      <button
        onClick={onClose}
        className="w-full text-slate-400 hover:text-white py-3 min-h-[52px] text-base"
      >
        Cancelar
      </button>
    </div>
  );

  // ── Vista: Talo redirect ────────────────────────────────────────────────────
  const vistaTalo = (
    <div className="space-y-4">
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 text-sm text-amber-300">
        Se generó tu enlace de pago. Hacé clic para completar el pago en Talo.
        El estado se actualizará automáticamente una vez confirmado.
      </div>
      <a
        href={taloUrl ?? ""}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-4 min-h-[56px] text-base flex items-center justify-center gap-2"
      >
        Ir a Talo Pay →
      </a>
      <button
        onClick={onClose}
        className="w-full text-slate-500 hover:text-slate-400 py-2 min-h-[44px] text-sm"
      >
        Cerrar
      </button>
    </div>
  );

  // ── Vista: instrucciones de transferencia ───────────────────────────────────
  const vistaTransferencia = transferenciaEnviada ? (
    <div className="space-y-5 text-center">
      <div className="text-5xl">✓</div>
      <p className="text-white font-semibold text-lg">
        ¡Gracias! Ya avisamos que vas a transferir.
      </p>
      <p className="text-slate-400 text-sm">
        En cuanto verifiquemos el pago en nuestra cuenta, lo vamos a confirmar
        y vas a ver el estado actualizado.
      </p>
      <button
        onClick={onClose}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-3 min-h-[48px] text-base"
      >
        Cerrar
      </button>
    </div>
  ) : (
    <div className="space-y-5">
      {/* Paso 1 */}
      <div>
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          Paso 1 — Anotá tu código de pago
        </p>
        <CampoCopia etiqueta="Tu código de referencia" valor={refCode} grande />
        <p className="text-xs text-slate-400 mt-2">
          Vas a necesitar este código en el Paso 3. También lo podés copiar con
          el botón.
        </p>
      </div>

      {/* Paso 2 */}
      <div>
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          Paso 2 — Hacé la transferencia
        </p>
        <div className="space-y-2">
          <CampoCopia etiqueta="CVU" valor={cvu || "Consultá al equipo de Escobar Instalaciones"} />
          <CampoCopia etiqueta="Alias" valor={alias || "Consultá al equipo de Escobar Instalaciones"} />
          <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 mb-1">
              Importe exacto a transferir
            </p>
            <p className="text-2xl font-bold text-white">{importeStr}</p>
          </div>
        </div>
      </div>

      {/* Paso 3 */}
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 space-y-1">
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">
          Paso 3 — Muy importante
        </p>
        <p className="text-sm text-amber-200">
          En el campo <strong>"Concepto"</strong> o{" "}
          <strong>"Referencia"</strong> de tu banco escribí tu código:{" "}
          <strong className="font-mono text-white">{refCode}</strong>
        </p>
        <p className="text-xs text-amber-300 mt-1">
          Esto nos permite identificar tu pago entre los de todos los clientes.
          Sin el código, la confirmación puede demorar.
        </p>
      </div>

      {/* Paso 4 — avisarnos */}
      <div>
        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          Paso 4 — Avisanos cuando termines
        </p>
        <button
          onClick={handleYaTransferi}
          disabled={isPending}
          className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white font-bold rounded-xl px-5 py-4 min-h-[64px] text-lg transition-colors"
        >
          {isPending ? "Registrando aviso…" : "✓ Ya hice la transferencia"}
        </button>
        <p className="text-sm text-slate-400 text-center mt-2">
          Tocá este botón después de completar la transferencia en tu banco.
        </p>
      </div>

      <button
        onClick={() => setMostrarTransferencia(false)}
        className="w-full text-slate-500 hover:text-slate-400 py-2 min-h-[44px] text-sm"
      >
        ← Volver a las opciones de pago
      </button>
    </div>
  );

  // ── Determinar qué vista mostrar ────────────────────────────────────────────
  let contenido;
  if (taloUrl) {
    contenido = vistaTalo;
  } else if (mostrarTransferencia) {
    contenido = vistaTransferencia;
  } else if (confirmarMP) {
    contenido = vistaConfirmarMP;
  } else {
    contenido = vistaOpciones;
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
            <strong className="text-white text-lg">{importeStr}</strong>
          </p>

          {error && (
            <div
              role="alert"
              className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg px-4 py-3 text-sm mb-4"
            >
              {error}
            </div>
          )}

          {contenido}

          <Dialog.Close className="absolute top-4 right-4 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors">
            <span aria-hidden="true" className="text-xl">✕</span>
            <span className="sr-only">Cerrar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

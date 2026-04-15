"use client";

import { useState } from "react";
import type { PagoPlano } from "@/components/portal/CalendarioPagos";
import { PagoTotalModal } from "@/components/portal/PagoTotalModal";

interface DeudaItem {
  pago: PagoPlano;
  descripcionCuenta: string;
}

interface Props {
  deudas: DeudaItem[];
}

export function BannerDeudaTotal({ deudas }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);

  if (deudas.length === 0) return null;

  const total = deudas.reduce((s, d) => s + d.pago.importe, 0);
  const totalStr = `$${total.toLocaleString("es-AR")}`;

  return (
    <>
      <div
        role="alert"
        className="bg-red-900/30 border border-red-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <p className="text-red-300 font-bold text-lg leading-tight">
            Tenés {deudas.length} pago{deudas.length !== 1 ? "s" : ""} pendiente{deudas.length !== 1 ? "s" : ""}
          </p>
          <p className="text-red-400 text-sm mt-1">
            Total adeudado:{" "}
            <strong className="text-white text-xl font-bold">{totalStr}</strong>
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl px-6 py-4 min-h-[60px] text-lg transition-colors"
        >
          Pagar todo ahora
        </button>
      </div>

      {modalAbierto && (
        <PagoTotalModal
          deudas={deudas}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}

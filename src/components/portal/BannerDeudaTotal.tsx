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
        aria-label={`${deudas.length === 1 ? "Hay un pago por regularizar" : `Hay ${deudas.length} pagos por regularizar`}`}
        className="bg-orange-950/30 border border-orange-700/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <p className="text-orange-300 font-bold text-lg leading-tight">
            {deudas.length === 1 ? "Hay un pago por atender" : `Hay ${deudas.length} pagos por atender`}
          </p>
          <p className="text-orange-400/80 text-sm mt-1">
            Total a regularizar:{" "}
            <strong className="text-white text-xl font-bold">{totalStr}</strong>
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="w-full sm:w-auto shrink-0 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl px-6 py-4 min-h-[60px] text-lg transition-colors"
        >
          Regularizar pagos
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

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
        className="bg-orange-950/30 border border-orange-700/50 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
          className="w-full sm:w-auto shrink-0 bg-tactical-500 hover:bg-tactical-400 border border-tactical-600 border-b-[4px] border-b-tactical-600 active:border-b active:translate-y-[3px] text-slate-900 font-bold uppercase tracking-widest rounded-sm px-6 py-4 min-h-[60px] text-sm transition-all duration-150 ease-mech-press"
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

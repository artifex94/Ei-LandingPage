"use client";

import { useActionState } from "react";
import { registrarPagoManual } from "@/app/admin/cuentas/actions";
import { METODOS } from "@/lib/constants/payment";

interface Props {
  cuentaId: string;
  mes: number;
  anio: number;
  importe: number;
}

export function PagoManualBulkForm({ cuentaId, mes, anio, importe }: Props) {
  const [state, action, pending] = useActionState(registrarPagoManual, {});

  if (state.ok) {
    return (
      <span className="text-green-400 text-sm font-semibold">✓ Registrado</span>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2 shrink-0">
      <input type="hidden" name="cuenta_id" value={cuentaId} />
      <input type="hidden" name="mes" value={mes} />
      <input type="hidden" name="anio" value={anio} />
      <input type="hidden" name="importe" value={importe} />

      <select
        name="metodo"
        className="bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-2 text-sm focus:outline-2 focus:outline-orange-500 min-h-[44px]"
        aria-label="Método de pago"
      >
        {METODOS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending}
        className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]"
      >
        {pending ? "…" : "Cobrado"}
      </button>

      {state.errores && (
        <p role="alert" className="text-red-400 text-xs">{state.errores[0]}</p>
      )}
    </form>
  );
}

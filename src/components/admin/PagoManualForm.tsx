"use client";

import { useActionState } from "react";
import { registrarPagoManual } from "@/app/admin/cuentas/actions";

interface Props {
  cuentaId: string;
  mes: number;
  anio: number;
  importe: number;
}

const METODOS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TRANSFERENCIA_BANCARIA", label: "Transferencia bancaria" },
  { value: "MERCADOPAGO", label: "MercadoPago" },
  { value: "TALO_CVU", label: "Talo (crypto)" },
];

export function PagoManualForm({ cuentaId, mes, anio, importe }: Props) {
  const [state, action, pending] = useActionState(registrarPagoManual, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="cuenta_id" value={cuentaId} />
      <input type="hidden" name="mes" value={mes} />
      <input type="hidden" name="anio" value={anio} />

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Importe
        </label>
        <input
          name="importe"
          type="number"
          min="0"
          step="100"
          defaultValue={importe}
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-32 focus:outline-2 focus:outline-orange-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Método
        </label>
        <select
          name="metodo"
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500"
        >
          {METODOS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {pending ? "Guardando…" : "Registrar pago"}
      </button>

      {state.ok && (
        <p className="text-green-400 text-sm font-medium">¡Pago registrado!</p>
      )}
      {state.errores && (
        <p className="text-red-400 text-sm">{state.errores[0]}</p>
      )}
    </form>
  );
}

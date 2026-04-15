"use client";

import { useActionState } from "react";
import { confirmarTransferencia } from "@/app/admin/pagos/actions";

interface Props {
  pagoId: string;
}

export function ConfirmarTransferenciaForm({ pagoId }: Props) {
  const [state, action, pending] = useActionState(confirmarTransferencia, {});

  if (state.ok) {
    return (
      <span className="text-green-400 text-sm font-semibold">✓ Pago confirmado</span>
    );
  }

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="pago_id" value={pagoId} />
      <button
        type="submit"
        disabled={pending}
        className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors min-h-[40px]"
      >
        {pending ? "Confirmando…" : "✓ Confirmar pago"}
      </button>
      {state.error && (
        <p className="text-red-400 text-xs">{state.error}</p>
      )}
    </form>
  );
}

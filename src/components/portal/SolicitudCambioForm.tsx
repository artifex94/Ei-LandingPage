"use client";

import { useState, useActionState } from "react";
import { crearSolicitudCambio } from "@/app/portal/perfil/actions";

interface Props {
  campo: string;
  campoLabel: string;
  valorActual: string | null;
  tienePendiente: boolean;
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-4 py-3 text-base focus:outline-2 focus:outline-orange-500 min-h-[48px]";

export function SolicitudCambioForm({
  campo,
  campoLabel,
  valorActual,
  tienePendiente,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(crearSolicitudCambio, null);

  if (tienePendiente) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-3 py-1">
        <span aria-hidden="true">⏳</span> Solicitud pendiente de revisión
      </span>
    );
  }

  if (state?.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-900/30 border border-green-700/50 rounded-full px-3 py-1">
        <span aria-hidden="true">✓</span> Solicitud enviada — te avisamos cuando la revisemos
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-orange-400 hover:text-orange-300 hover:underline font-medium transition-colors min-h-[32px]"
      >
        Solicitar cambio
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="campo" value={campo} />

      {state?.error && (
        <div
          role="alert"
          className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor={`valor-${campo}`}
          className="block text-xs font-medium text-slate-400 mb-1"
        >
          Nuevo valor para {campoLabel}
        </label>
        <input
          id={`valor-${campo}`}
          name="valor_nuevo"
          type={campo === "email" ? "email" : "text"}
          required
          defaultValue=""
          placeholder={valorActual ?? `Ingresá el nuevo ${campoLabel.toLowerCase()}`}
          className={inputCls}
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2 min-h-[40px] text-sm transition-colors"
        >
          {pending ? "Enviando..." : "Enviar solicitud"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm min-h-[40px] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

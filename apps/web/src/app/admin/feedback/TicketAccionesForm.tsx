"use client";

import { useActionState } from "react";
import Textarea from "@/components/ui/Textarea";
import { actualizarTicketFeedback } from "./actions";

const ACCION_BOTON: Record<string, { label: string; cls: string }> = {
  EN_REVISION: { label: "En revisión", cls: "bg-blue-600 hover:bg-blue-700" },
  RESUELTO: { label: "Marcar resuelto", cls: "bg-green-600 hover:bg-green-700" },
  DESCARTADO: { label: "Descartar", cls: "bg-slate-600 hover:bg-slate-500" },
};

export function TicketAccionesForm({
  id,
  estado,
  notaActual,
}: {
  id: string;
  estado: string;
  notaActual: string | null;
}) {
  const [state, action, pending] = useActionState(actualizarTicketFeedback, null);

  const accionesDisponibles = Object.keys(ACCION_BOTON).filter((a) => a !== estado);

  return (
    <form action={action} className="mt-4 border-t border-slate-700 pt-4 space-y-3">
      <input type="hidden" name="id" value={id} />

      {state?.error && (
        <p role="alert" className="text-red-400 text-xs">
          {state.error}
        </p>
      )}

      <Textarea
        name="nota_admin"
        aria-label="Nota para el cliente"
        rows={2}
        placeholder="Nota para el cliente (opcional; se muestra cuando resolvés o descartás)"
        defaultValue={notaActual ?? ""}
      />

      <div className="flex flex-wrap gap-2">
        {accionesDisponibles.map((accion) => {
          const cfg = ACCION_BOTON[accion];
          return (
            <button
              key={accion}
              type="submit"
              name="accion"
              value={accion}
              disabled={pending}
              className={`inline-flex items-center gap-2 text-sm ${cfg.cls} disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium transition-colors min-h-[36px]`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}

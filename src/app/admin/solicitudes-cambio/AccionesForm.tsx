"use client";

import { useActionState, useState } from "react";
import { rechazarCambio, editarYAprobarCambio, aprobarCambio } from "./actions";

interface Props {
  id: string;
  valorPropuesto: string;
}

const btnBase =
  "px-3 py-1.5 rounded-md text-xs font-semibold min-h-[36px] transition-colors";

// ── Botón Aprobar (simple Server Action sin state) ────────────────────────────

export function AprobarButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAprobar() {
    setLoading(true);
    setError(null);
    const result = await aprobarCambio(id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // Si no hay error, revalidatePath recargará la página automáticamente.
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={handleAprobar}
        className={`${btnBase} bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white`}
      >
        {loading ? "Aprobando..." : "Aprobar"}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Formulario Rechazar ───────────────────────────────────────────────────────

export function RechazarForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(rechazarCambio, null);

  if (state?.ok) {
    return (
      <span className="text-xs text-slate-400 italic">Rechazado</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnBase} bg-red-900/60 hover:bg-red-800 text-red-300`}
      >
        Rechazar
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 min-w-[200px]">
      <input type="hidden" name="id" value={id} />
      {state?.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      <input
        name="notas_admin"
        type="text"
        placeholder="Motivo (opcional)"
        maxLength={500}
        className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 rounded px-3 py-1.5 text-xs focus:outline-2 focus:outline-orange-500"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`${btnBase} bg-red-800 hover:bg-red-700 disabled:opacity-60 text-white`}
        >
          {pending ? "..." : "Confirmar rechazo"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-white px-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Formulario Editar y Aprobar ───────────────────────────────────────────────

export function EditarYAprobarForm({ id, valorPropuesto }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(editarYAprobarCambio, null);

  if (state?.ok) {
    return (
      <span className="text-xs text-slate-400 italic">Aprobado con edición</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnBase} bg-slate-700 hover:bg-slate-600 text-slate-200`}
      >
        Editar y aprobar
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 min-w-[220px]">
      <input type="hidden" name="id" value={id} />
      {state?.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      <input
        name="valor_corregido"
        type="text"
        required
        defaultValue={valorPropuesto}
        className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-1.5 text-xs focus:outline-2 focus:outline-orange-500"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`${btnBase} bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white`}
        >
          {pending ? "..." : "Aprobar corregido"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-white px-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

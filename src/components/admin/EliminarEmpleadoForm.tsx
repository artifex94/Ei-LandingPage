"use client";

import { useState, useActionState } from "react";
import { eliminarEmpleado } from "@/app/admin/empleados/actions";

export function EliminarEmpleadoForm({ id, nombre }: { id: string; nombre: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [state, action, pending] = useActionState(eliminarEmpleado, {});

  return (
    <div className="border border-red-900/40 rounded-xl p-5 space-y-3 bg-red-950/20">
      <div>
        <p className="text-sm font-semibold text-red-400">Zona de peligro</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Esta acción es irreversible. Solo se permite si el empleado no tiene OTs, turnos ni ausencias registradas.
        </p>
      </div>

      {state.errores && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
          {state.errores.map((e, i) => (
            <p key={i} className="text-sm text-red-300">{e}</p>
          ))}
        </div>
      )}

      {!confirmando ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="text-sm text-red-400 hover:text-red-300 border border-red-800/50 hover:border-red-700 px-4 py-2 rounded-lg transition-colors"
        >
          Eliminar empleado…
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-amber-300">
            ¿Confirmar eliminación de <strong>{nombre}</strong>? Esta acción borra el perfil y el usuario de Supabase Auth.
          </p>
          <form action={action} className="flex gap-2">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={pending}
              className="text-sm font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { activarOverrideSuspension } from "@/app/admin/cuentas/actions";

interface Props {
  cuentaId: string;
  overrideActivo: boolean;
  overrideExpira: string | null; // ISO string desde el server component
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

export function OverrideSuspensionForm({ cuentaId, overrideActivo, overrideExpira }: Props) {
  const [state, action, pending] = useActionState(activarOverrideSuspension, {});

  const expiresAt = overrideExpira ? new Date(overrideExpira) : null;
  const aun_vigente = expiresAt && expiresAt > new Date();

  return (
    <div className="bg-slate-800 rounded-xl border border-amber-700/40 p-5">
      <h3 className="text-base font-semibold text-amber-300 mb-1">
        Override de suspensión
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Reactiva temporalmente el servicio sin registrar un pago. Se revertirá automáticamente
        al expirar el plazo si la deuda sigue sin saldarse.
      </p>

      {aun_vigente && expiresAt && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 mb-4 text-sm text-amber-300">
          Override activo hasta{" "}
          <strong>
            {expiresAt.toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </strong>
        </div>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="cuenta_id" value={cuentaId} />

        {state.ok && (
          <p className="text-green-400 text-sm bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
            Override activado correctamente.
          </p>
        )}
        {state.errores && (
          <div className="bg-red-900/30 border border-red-700/60 rounded-lg p-3">
            {state.errores.map((e, i) => (
              <p key={i} className="text-red-300 text-sm">{e}</p>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="override-ttl" className="block text-sm font-medium text-slate-300 mb-1">
            Duración del override <span aria-hidden="true">*</span>
          </label>
          <select id="override-ttl" name="ttl_horas" defaultValue="48" className={inputCls}>
            <option value="24">24 horas</option>
            <option value="48">48 horas</option>
            <option value="72">72 horas</option>
          </select>
        </div>

        <div>
          <label htmlFor="override-justificacion" className="block text-sm font-medium text-slate-300 mb-1">
            Justificación <span aria-hidden="true">*</span>
            <span className="text-slate-500 font-normal ml-1">(mínimo 10 caracteres)</span>
          </label>
          <textarea
            id="override-justificacion"
            name="justificacion"
            rows={3}
            required
            minLength={10}
            placeholder="Ej: Cliente confirmó pago por transferencia pendiente de acreditación..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {pending ? "Aplicando override…" : "Activar override temporal"}
        </button>
      </form>
    </div>
  );
}

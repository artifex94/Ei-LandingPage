"use client";

import { useActionState } from "react";
import { crearSolicitud } from "./actions";

interface Props {
  cuentas: { id: string; descripcion: string }[];
  cuentaPreId?: string;
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-4 py-3 text-base focus:outline-2 focus:outline-orange-500 min-h-[48px]";

export function SolicitudForm({ cuentas, cuentaPreId }: Props) {
  const [state, action, pending] = useActionState(crearSolicitud, null);

  if (state?.ok) {
    return (
      <div
        role="status"
        className="bg-green-900/40 border border-green-700 rounded-xl p-6 text-center"
      >
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-green-300 text-lg">Solicitud enviada</p>
        <p className="text-green-400 text-sm mt-2">
          Nos comunicamos con vos a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.error && (
        <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="cuenta-select" className="block text-sm font-medium text-slate-300 mb-1">
          Servicio con el problema
        </label>
        <select
          id="cuenta-select"
          name="cuenta_id"
          required
          defaultValue={cuentaPreId ?? ""}
          className={`${inputCls} bg-slate-700`}
        >
          <option value="" disabled>Seleccioná un servicio</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>{c.descripcion}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="prioridad-select" className="block text-sm font-medium text-slate-300 mb-1">
          Urgencia
        </label>
        <select
          id="prioridad-select"
          name="prioridad"
          defaultValue="MEDIA"
          className={`${inputCls} bg-slate-700`}
        >
          <option value="BAJA">Baja — Puede esperar unos días</option>
          <option value="MEDIA">Media — Esta semana</option>
          <option value="ALTA">Alta — Lo antes posible</option>
        </select>
      </div>

      <div>
        <label htmlFor="descripcion-input" className="block text-sm font-medium text-slate-300 mb-1">
          Descripción del problema
        </label>
        <p className="text-xs text-slate-400 mb-2">
          Contanos qué está pasando con el mayor detalle posible.
        </p>
        <textarea
          id="descripcion-input"
          name="descripcion"
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-4 py-3 text-base focus:outline-2 focus:outline-orange-500 resize-none"
          placeholder="Ej: La alarma no responde cuando activo el teclado principal..."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors"
      >
        {pending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}

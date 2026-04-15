"use client";

import { useActionState } from "react";
import { crearCliente } from "@/app/admin/clientes/actions";

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

export function NuevoClienteForm() {
  const [state, action, pending] = useActionState(crearCliente, {});

  return (
    <form action={action} className="space-y-4">
      {state.errores && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
          <ul className="text-sm text-red-300 list-disc list-inside space-y-1">
            {state.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-slate-300 mb-1">
          Nombre completo <span aria-hidden="true">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          autoComplete="name"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
          Email <span aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="dni" className="block text-sm font-medium text-slate-300 mb-1">
          DNI{" "}
          <span className="text-slate-500 font-normal text-xs">(opcional)</span>
        </label>
        <input
          id="dni"
          name="dni"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{7,8}"
          placeholder="Sin puntos"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-slate-300 mb-1">
          Teléfono{" "}
          <span className="text-slate-500 font-normal text-xs">(opcional, E.164)</span>
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          placeholder="+5491112345678"
          autoComplete="tel"
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        {pending ? "Creando cliente…" : "Crear cliente"}
      </button>
    </form>
  );
}

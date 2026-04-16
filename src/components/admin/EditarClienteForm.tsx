"use client";

import { useActionState } from "react";
import { actualizarCliente } from "@/app/admin/clientes/actions";
import type { TipoTitular } from "@/generated/prisma/client";

interface Cliente {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  tipo_titular: TipoTitular | null;
}

interface Props {
  cliente: Cliente;
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

const TIPOS_TITULAR = [
  { value: "", label: "Sin clasificar" },
  { value: "RESIDENCIAL", label: "Residencial" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "OFICINAS", label: "Oficinas" },
  { value: "VEHICULO", label: "Vehículo" },
];

export function EditarClienteForm({ cliente }: Props) {
  const [state, action, pending] = useActionState(actualizarCliente, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={cliente.id} />

      {state.ok && (
        <p className="text-green-400 text-sm font-medium bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
          Datos actualizados correctamente.
        </p>
      )}
      {state.errores && (
        <div className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg p-3">
          <ul className="text-sm list-disc list-inside space-y-1">
            {state.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="cli-nombre" className="block text-sm font-medium text-slate-300 mb-1">
            Nombre completo <span aria-hidden="true">*</span>
          </label>
          <input
            id="cli-nombre"
            name="nombre"
            type="text"
            required
            defaultValue={cliente.nombre}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="cli-dni" className="block text-sm font-medium text-slate-300 mb-1">
            DNI{" "}
            <span className="text-slate-500 font-normal text-xs">(opcional)</span>
          </label>
          <input
            id="cli-dni"
            name="dni"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{7,8}"
            placeholder="Sin puntos"
            defaultValue={cliente.dni ?? ""}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="cli-telefono" className="block text-sm font-medium text-slate-300 mb-1">
            Teléfono{" "}
            <span className="text-slate-500 font-normal text-xs">(opcional)</span>
          </label>
          <input
            id="cli-telefono"
            name="telefono"
            type="tel"
            placeholder="+5491112345678"
            defaultValue={cliente.telefono ?? ""}
            className={inputCls}
          />
        </div>

        {cliente.email && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-1">Email</p>
            <p className="text-sm text-slate-400 bg-slate-700/50 border border-slate-700 rounded-lg px-3 py-2">
              {cliente.email}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              El email se modifica desde Supabase Auth.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="cli-tipo" className="block text-sm font-medium text-slate-300 mb-1">
            Tipo de titular
          </label>
          <select
            id="cli-tipo"
            name="tipo_titular"
            defaultValue={cliente.tipo_titular ?? ""}
            className={inputCls}
          >
            {TIPOS_TITULAR.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cli-activo" className="block text-sm font-medium text-slate-300 mb-1">
            Estado del perfil
          </label>
          <select
            id="cli-activo"
            name="activo"
            defaultValue={cliente.activo ? "true" : "false"}
            className={inputCls}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

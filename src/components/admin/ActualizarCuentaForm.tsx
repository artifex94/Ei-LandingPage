"use client";

import { useActionState } from "react";
import { actualizarCuenta } from "@/app/admin/cuentas/actions";

interface Cuenta {
  id: string;
  descripcion: string;
  categoria: string;
  estado: string;
  costo_mensual: number | { toNumber: () => number };
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

const CATEGORIAS = [
  { value: "ALARMA_MONITOREO", label: "Alarma y monitoreo" },
  { value: "DOMOTICA", label: "Domótica" },
  { value: "CAMARA_CCTV", label: "Cámaras CCTV" },
  { value: "ANTENA_STARLINK", label: "Antena StarLink" },
  { value: "OTRO", label: "Otro" },
];

const ESTADOS = [
  { value: "ACTIVA", label: "Activa" },
  { value: "SUSPENDIDA_PAGO", label: "Suspendida por pago" },
  { value: "EN_MANTENIMIENTO", label: "En mantenimiento" },
  { value: "BAJA_DEFINITIVA", label: "Baja definitiva" },
];

export function ActualizarCuentaForm({ cuenta }: { cuenta: Cuenta }) {
  const [state, action, pending] = useActionState(actualizarCuenta, {});
  const costoActual =
    typeof cuenta.costo_mensual === "number"
      ? cuenta.costo_mensual
      : cuenta.costo_mensual.toNumber();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={cuenta.id} />

      {state.ok && (
        <p className="text-green-400 text-sm font-medium bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
          Cuenta actualizada correctamente.
        </p>
      )}
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
        <label htmlFor="descripcion" className="block text-sm font-medium text-slate-300 mb-1">
          Dirección / descripción
        </label>
        <input
          id="descripcion"
          name="descripcion"
          type="text"
          required
          defaultValue={cuenta.descripcion}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="categoria" className="block text-sm font-medium text-slate-300 mb-1">
            Categoría
          </label>
          <select id="categoria" name="categoria" defaultValue={cuenta.categoria} className={inputCls}>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-slate-300 mb-1">
            Estado
          </label>
          <select id="estado" name="estado" defaultValue={cuenta.estado} className={inputCls}>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="costo_mensual" className="block text-sm font-medium text-slate-300 mb-1">
          Costo mensual (ARS)
        </label>
        <input
          id="costo_mensual"
          name="costo_mensual"
          type="number"
          min="0"
          step="100"
          required
          defaultValue={costoActual}
          className={inputCls}
        />
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

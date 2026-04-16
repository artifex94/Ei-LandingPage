"use client";

import { useState, useActionState } from "react";
import { crearCuenta } from "@/app/admin/cuentas/actions";

interface Props {
  perfilId: string;
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

const CATEGORIAS = [
  { value: "ALARMA_MONITOREO", label: "Alarma y monitoreo" },
  { value: "DOMOTICA", label: "Domótica" },
  { value: "CAMARA_CCTV", label: "Cámaras CCTV" },
  { value: "ANTENA_STARLINK", label: "Antena StarLink" },
  { value: "OTRO", label: "Otro" },
];

export function NuevaCuentaForm({ perfilId }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [state, action, pending] = useActionState(crearCuenta, {});

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors border border-orange-700/40 hover:border-orange-600 rounded-xl px-4 py-3 w-full justify-center"
      >
        <span aria-hidden="true" className="text-lg leading-none">+</span>
        Agregar cuenta
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-orange-700/40 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Nueva cuenta</h3>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="perfil_id" value={perfilId} />

        {state.ok && (
          <p className="text-green-400 text-sm font-medium bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
            Cuenta creada correctamente.
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
          <div>
            <label htmlFor="nueva-ref" className="block text-sm font-medium text-slate-300 mb-1">
              Referencia Softguard <span aria-hidden="true">*</span>
            </label>
            <input
              id="nueva-ref"
              name="softguard_ref"
              type="text"
              required
              placeholder="Ej: SG-00123 o MANUAL-001"
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">Debe ser única en el sistema.</p>
          </div>

          <div>
            <label htmlFor="nueva-categoria" className="block text-sm font-medium text-slate-300 mb-1">
              Categoría <span aria-hidden="true">*</span>
            </label>
            <select id="nueva-categoria" name="categoria" required className={inputCls}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="nueva-descripcion" className="block text-sm font-medium text-slate-300 mb-1">
            Descripción / dirección <span aria-hidden="true">*</span>
          </label>
          <input
            id="nueva-descripcion"
            name="descripcion"
            type="text"
            required
            placeholder="Ej: Alarma Casa Central — Av. Rivadavia 1234"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="nueva-calle" className="block text-sm font-medium text-slate-300 mb-1">
              Calle
            </label>
            <input
              id="nueva-calle"
              name="calle"
              type="text"
              placeholder="Av. Rivadavia 1234"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="nueva-localidad" className="block text-sm font-medium text-slate-300 mb-1">
              Localidad
            </label>
            <input
              id="nueva-localidad"
              name="localidad"
              type="text"
              placeholder="Concordia"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="nueva-provincia" className="block text-sm font-medium text-slate-300 mb-1">
              Provincia
            </label>
            <input
              id="nueva-provincia"
              name="provincia"
              type="text"
              defaultValue="Entre Ríos"
              className={inputCls}
            />
          </div>
        </div>

        <div className="w-40">
          <label htmlFor="nueva-costo" className="block text-sm font-medium text-slate-300 mb-1">
            Costo mensual (ARS) <span aria-hidden="true">*</span>
          </label>
          <input
            id="nueva-costo"
            name="costo_mensual"
            type="number"
            min="0"
            step="100"
            defaultValue="20000"
            required
            className={inputCls}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {pending ? "Creando…" : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-slate-400 hover:text-white px-4 py-2.5 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

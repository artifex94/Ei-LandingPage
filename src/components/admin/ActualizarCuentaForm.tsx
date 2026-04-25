"use client";

import { useActionState, useState } from "react";
import { actualizarCuenta } from "@/app/admin/cuentas/actions";

interface Cuenta {
  id: string;
  descripcion: string;
  categoria: string;
  estado: string;
  costo_mensual: number | { toNumber: () => number };
  calle?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigo_postal?: string | null;
  notas_tecnicas?: string | null;
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
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(cuenta.estado);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  const costoActual =
    typeof cuenta.costo_mensual === "number"
      ? cuenta.costo_mensual
      : cuenta.costo_mensual.toNumber();

  const pidiendoBaja = estadoSeleccionado === "BAJA_DEFINITIVA" && cuenta.estado !== "BAJA_DEFINITIVA";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={cuenta.id} />

      {state.ok && (
        <p className="text-green-400 text-sm font-medium bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
          Cuenta actualizada correctamente.
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
          <select
            id="estado"
            name="estado"
            value={estadoSeleccionado}
            onChange={(e) => {
              setEstadoSeleccionado(e.target.value);
              setConfirmarBaja(false);
            }}
            className={inputCls}
          >
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

      {/* ── Dirección ─────────────────────────────────────────────────────── */}
      <fieldset className="border border-slate-700 rounded-xl p-4 space-y-3">
        <legend className="text-xs font-semibold text-slate-400 px-1 uppercase tracking-wide">
          Dirección del servicio
        </legend>
        <div>
          <label htmlFor="calle" className="block text-sm font-medium text-slate-300 mb-1">
            Calle y número
          </label>
          <input
            id="calle"
            name="calle"
            type="text"
            placeholder="Ej: Rawson 255"
            defaultValue={cuenta.calle ?? ""}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="localidad" className="block text-sm font-medium text-slate-300 mb-1">
              Localidad
            </label>
            <input
              id="localidad"
              name="localidad"
              type="text"
              placeholder="Victoria"
              defaultValue={cuenta.localidad ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="provincia" className="block text-sm font-medium text-slate-300 mb-1">
              Provincia
            </label>
            <input
              id="provincia"
              name="provincia"
              type="text"
              placeholder="Entre Ríos"
              defaultValue={cuenta.provincia ?? ""}
              className={inputCls}
            />
          </div>
        </div>
        <div className="w-32">
          <label htmlFor="codigo_postal" className="block text-sm font-medium text-slate-300 mb-1">
            Código postal
          </label>
          <input
            id="codigo_postal"
            name="codigo_postal"
            type="text"
            placeholder="3153"
            defaultValue={cuenta.codigo_postal ?? ""}
            className={inputCls}
          />
        </div>
      </fieldset>

      {/* ── Notas técnicas ────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="notas_tecnicas" className="block text-sm font-medium text-slate-300 mb-1">
          Notas técnicas
          <span className="text-slate-500 font-normal text-xs ml-1">(interno)</span>
        </label>
        <textarea
          id="notas_tecnicas"
          name="notas_tecnicas"
          rows={3}
          placeholder="Observaciones internas, historial de intervenciones, etc."
          defaultValue={cuenta.notas_tecnicas ?? ""}
          className={`${inputCls} resize-y`}
        />
      </div>

      {/* ── Bloque de confirmación de baja definitiva ────────────────────── */}
      {pidiendoBaja && (
        <div className="bg-red-950/40 border border-red-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-lg" aria-hidden="true">⚠</span>
            <p className="text-red-300 font-semibold text-sm">
              Estás por dar de baja definitivamente esta cuenta
            </p>
          </div>
          <p className="text-red-200/70 text-xs">
            Esta acción marca la cuenta como inactiva y queda registrada en el historial.
            Indicá el motivo antes de confirmar.
          </p>

          <div>
            <label htmlFor="motivo_baja" className="block text-sm font-medium text-red-300 mb-1">
              Motivo de la baja <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="motivo_baja"
              name="motivo_baja"
              rows={2}
              required={pidiendoBaja}
              placeholder="Ej: Cliente solicitó cancelación del servicio. Se retiró el equipo el …"
              className="w-full bg-slate-700 border border-red-700/60 text-white placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-red-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmarBaja}
              onChange={(e) => setConfirmarBaja(e.target.checked)}
              className="accent-red-500 w-4 h-4"
            />
            <span className="text-sm text-red-200">Confirmo que quiero dar de baja esta cuenta</span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || (pidiendoBaja && !confirmarBaja)}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

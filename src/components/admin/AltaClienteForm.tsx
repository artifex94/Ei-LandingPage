"use client";

import { useState, useActionState } from "react";
import { altaClienteConCuenta } from "@/app/admin/clientes/actions";
import { siteConfig } from "@/config/site";

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

const CATEGORIAS = [
  { value: "ALARMA_MONITOREO", label: "Alarma y monitoreo" },
  { value: "DOMOTICA", label: "Domótica" },
  { value: "CAMARA_CCTV", label: "Cámaras CCTV" },
  { value: "ANTENA_STARLINK", label: "Antena StarLink" },
  { value: "OTRO", label: "Otro" },
];

const TIPOS_TITULAR = [
  { value: "RESIDENCIAL", label: "Residencial" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "OFICINAS", label: "Oficinas" },
  { value: "VEHICULO", label: "Vehículo" },
];

const CONDICIONES_IVA = [
  { value: "RESPONSABLE_INSCRIPTO", label: "Responsable Inscripto" },
  { value: "MONOTRIBUTISTA", label: "Monotributista" },
  { value: "EXENTO", label: "Exento" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor Final" },
  { value: "NO_RESPONSABLE", label: "No Responsable" },
];

export function AltaClienteForm() {
  const [state, action, pending] = useActionState(altaClienteConCuenta, {});
  const [requiereFactura, setRequiereFactura] = useState(false);

  return (
    <form action={action} className="space-y-8">
      {state.errores && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
          <ul className="text-sm text-red-300 list-disc list-inside space-y-1">
            {state.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Section 1: Datos del titular ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white border-b border-slate-700 pb-2">
          Datos del titular
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label htmlFor="telefono" className="block text-sm font-medium text-slate-300 mb-1">
              Teléfono <span aria-hidden="true">*</span>
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              required
              placeholder="3436575372"
              autoComplete="tel"
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">10 dígitos sin 0 ni 15</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email{" "}
              <span className="text-slate-500 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">Si no tiene, se genera uno interno</p>
          </div>
        </div>

        <div>
          <label htmlFor="tipo_titular" className="block text-sm font-medium text-slate-300 mb-1">
            Tipo de titular{" "}
            <span className="text-slate-500 font-normal text-xs">(opcional)</span>
          </label>
          <select id="tipo_titular" name="tipo_titular" className={inputCls}>
            <option value="">Sin especificar</option>
            {TIPOS_TITULAR.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="requiere_factura"
            name="requiere_factura"
            type="checkbox"
            value="true"
            checked={requiereFactura}
            onChange={(e) => setRequiereFactura(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
          />
          <label htmlFor="requiere_factura" className="text-sm font-medium text-slate-300">
            Requiere factura
          </label>
        </div>

        {/* Hidden field so unchecked checkbox still submits "false" */}
        {!requiereFactura && (
          <input type="hidden" name="requiere_factura" value="false" />
        )}

        {requiereFactura && (
          <div className="space-y-4 bg-slate-700/40 border border-slate-600 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cuit" className="block text-sm font-medium text-slate-300 mb-1">
                  CUIT
                </label>
                <input
                  id="cuit"
                  name="cuit"
                  type="text"
                  placeholder="20-12345678-9"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="condicion_iva" className="block text-sm font-medium text-slate-300 mb-1">
                  Condición IVA
                </label>
                <select id="condicion_iva" name="condicion_iva" className={inputCls}>
                  <option value="">Sin especificar</option>
                  {CONDICIONES_IVA.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="razon_social" className="block text-sm font-medium text-slate-300 mb-1">
                Razón social{" "}
                <span className="text-slate-500 font-normal text-xs">(opcional)</span>
              </label>
              <input
                id="razon_social"
                name="razon_social"
                type="text"
                placeholder="Solo si difiere del nombre"
                className={inputCls}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <hr className="border-slate-700" />

      {/* ── Section 2: Primera cuenta de servicio ────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white border-b border-slate-700 pb-2">
          Primera cuenta de servicio
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-slate-300 mb-1">
              Categoría <span aria-hidden="true">*</span>
            </label>
            <select id="categoria" name="categoria" required className={inputCls}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="softguard_ref" className="block text-sm font-medium text-slate-300 mb-1">
              Referencia Softguard{" "}
              <span className="text-slate-500 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="softguard_ref"
              name="softguard_ref"
              type="text"
              placeholder="Ej: SG-00123"
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">Se generará automáticamente si está vacío</p>
          </div>
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-slate-300 mb-1">
            Descripción <span aria-hidden="true">*</span>
          </label>
          <input
            id="descripcion"
            name="descripcion"
            type="text"
            required
            placeholder="Ej: Alarma Casa Central — Av. Rivadavia 1234"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="calle" className="block text-sm font-medium text-slate-300 mb-1">
              Calle
            </label>
            <input
              id="calle"
              name="calle"
              type="text"
              placeholder="Av. Rivadavia 1234"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="localidad" className="block text-sm font-medium text-slate-300 mb-1">
              Localidad
            </label>
            <input
              id="localidad"
              name="localidad"
              type="text"
              placeholder="Victoria"
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
              defaultValue={siteConfig.contact.region}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:max-w-[160px]">
            <label htmlFor="codigo_postal" className="block text-sm font-medium text-slate-300 mb-1">
              Código postal
            </label>
            <input
              id="codigo_postal"
              name="codigo_postal"
              type="text"
              placeholder="3153"
              className={inputCls}
            />
          </div>

          <div className="sm:max-w-[200px]">
            <label htmlFor="costo_mensual" className="block text-sm font-medium text-slate-300 mb-1">
              Costo mensual (ARS){" "}
              <span className="text-slate-500 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="costo_mensual"
              name="costo_mensual"
              type="number"
              min="0"
              step="100"
              placeholder="Usa tarifa estándar"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        {pending ? "Creando cliente y cuenta…" : "Crear cliente con cuenta"}
      </button>
    </form>
  );
}

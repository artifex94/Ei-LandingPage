"use client";

import { useActionState, useState } from "react";
import { enviarSolicitudAlta } from "@/app/solicitud-alta/actions";
import type { SolicitudAltaResult } from "@/app/solicitud-alta/actions";

const initialState: SolicitudAltaResult = {};

export function SolicitudAltaForm() {
  const [state, action, pending] = useActionState(enviarSolicitudAlta, initialState);
  const [requiereFactura, setRequiereFactura] = useState(false);

  if (state.ok) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">¡Solicitud enviada!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Te avisaremos por WhatsApp cuando tu acceso esté listo. Revisá también que
            tengamos tu número correcto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <form action={action} className="space-y-4">
          {/* Error list */}
          {state.errores && state.errores.length > 0 && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-1">
              {state.errores.map((e, i) => (
                <p key={i} className="text-red-400 text-sm">
                  {e}
                </p>
              ))}
            </div>
          )}

          {/* Section: Personal data */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">
              Tus datos
            </h2>

            <div>
              <label htmlFor="nombre" className="block text-sm text-slate-300 mb-1.5">
                Nombre completo <span className="text-orange-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                autoComplete="name"
                placeholder="Juan Pérez"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm text-slate-300 mb-1.5">
                WhatsApp <span className="text-orange-500">*</span>
              </label>
              <div className="flex gap-2">
                <span className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-500 text-sm flex-shrink-0 flex items-center">
                  +549
                </span>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="3436575372"
                  className="min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">10 dígitos sin 0 ni 15</p>
            </div>

            <div>
              <label htmlFor="dni" className="block text-sm text-slate-300 mb-1.5">
                DNI
              </label>
              <input
                id="dni"
                name="dni"
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="Sin puntos"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="tipo_titular" className="block text-sm text-slate-300 mb-1.5">
                Tipo de titular
              </label>
              <select
                id="tipo_titular"
                name="tipo_titular"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
              >
                <option value="">Seleccioná una opción</option>
                <option value="RESIDENCIAL">Propietario / Inquilino</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="OFICINAS">Consorcio</option>
              </select>
            </div>
          </div>

          {/* Section: Billing */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">
              Facturación
            </h2>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="requiere_factura"
                value="true"
                checked={requiereFactura}
                onChange={(e) => setRequiereFactura(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <input
                type="hidden"
                name="requiere_factura"
                value={requiereFactura ? "true" : "false"}
              />
              <span className="text-sm text-slate-300">Requiero factura A o B</span>
            </label>

            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: requiereFactura ? "500px" : "0px" }}
            >
              <div className="space-y-4 pt-2">
                <div>
                  <label htmlFor="razon_social" className="block text-sm text-slate-300 mb-1.5">
                    Razón social <span className="text-orange-500">*</span>
                  </label>
                  <input
                    id="razon_social"
                    name="razon_social"
                    type="text"
                    placeholder="Nombre o empresa"
                    tabIndex={requiereFactura ? undefined : -1}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="cuit" className="block text-sm text-slate-300 mb-1.5">
                    CUIT <span className="text-orange-500">*</span>
                  </label>
                  <input
                    id="cuit"
                    name="cuit"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="Sin guiones (11 dígitos)"
                    tabIndex={requiereFactura ? undefined : -1}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="condicion_iva" className="block text-sm text-slate-300 mb-1.5">
                    Condición de IVA <span className="text-orange-500">*</span>
                  </label>
                  <select
                    id="condicion_iva"
                    name="condicion_iva"
                    tabIndex={requiereFactura ? undefined : -1}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                  >
                    <option value="">Seleccioná una opción</option>
                    <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                    <option value="MONOTRIBUTISTA">Monotributista</option>
                    <option value="EXENTO">Exento</option>
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="min-h-[48px] w-full rounded-xl border border-orange-600/70 bg-orange-500 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Enviando solicitud..." : "Solicitar acceso"}
          </button>
        </form>
      </div>
    </div>
  );
}

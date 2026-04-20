"use client";

import { useState, useTransition } from "react";
import { actualizarTarifa } from "@/lib/actions/configuracion";

export function ConfiguracionForm({ tarifaActual }: { tarifaActual: number }) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(fd: FormData) {
    setOk(false);
    setError(null);
    startTransition(async () => {
      const res = await actualizarTarifa(fd);
      if (res?.error) { setError(res.error); return; }
      setOk(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* Datos fiscales — solo lectura por ahora */}
      <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Datos del emisor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Razón social</p>
            <p className="text-white">ESCOBAR RAMIRO ANIBAL</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">CUIT</p>
            <p className="text-white">20-38557350-3</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Condición IVA</p>
            <p className="text-white">Monotributista</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Domicilio fiscal</p>
            <p className="text-white">Rawson 255, Victoria, Entre Ríos</p>
          </div>
        </div>
        <p className="text-xs text-slate-600">Para modificar los datos fiscales, editá el schema Prisma.</p>
      </section>

      {/* Tarifa estándar */}
      <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tarifa estándar mensual</h2>
        <p className="text-xs text-slate-400">
          Las cuentas sin precio override usan esta tarifa. Actualizar crea un registro en el historial.
        </p>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Monto actual: ${tarifaActual.toLocaleString("es-AR")}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">$</span>
              <input
                name="monto"
                type="number"
                min="1"
                step="100"
                defaultValue={tarifaActual}
                required
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {ok && (
            <p className="text-sm text-emerald-400">Tarifa actualizada correctamente.</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg transition-colors"
          >
            {pending ? "Guardando…" : "Actualizar tarifa"}
          </button>
        </form>
      </section>

      {/* Variables de entorno — referencia */}
      <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Variables de entorno</h2>
        <div className="space-y-2 text-xs font-mono">
          {[
            { key: "SOFTGUARD_DB_HOST",       label: "SoftGuard DB Host" },
            { key: "SOFTGUARD_DB_USER",       label: "SoftGuard DB User" },
            { key: "SOFTGUARD_EMBED_SECRET",  label: "Embed Secret (rotable)" },
            { key: "TWILIO_ACCOUNT_SID",      label: "Twilio SID" },
            { key: "TWILIO_PHONE_NUMBER",     label: "Twilio número" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-slate-400">{label}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                process.env[key] ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-400"
              }`}>
                {process.env[key] ? "configurado" : "no configurado"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

/**
 * Panel de salud de la suite web de SoftGuard (:8080) — área Sistema.
 *
 * Sonda /api/admin/softguard-status al montar y bajo demanda (botón):
 * estado de sesión, chequeos funcionales con latencia y catálogo de módulos
 * del Desktop con su disponibilidad. Los módulos que el portal ya consume
 * se marcan como "en uso".
 */

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { SoftguardStatusResponse, SondaResultado } from "@/app/api/admin/softguard-status/route";

// key_reference de los módulos que el portal consume hoy
const MODULOS_EN_USO = new Set(["WebRemoto", "WebCRM", "SerTec"]);

export function SoftGuardModulosPanel() {
  const [data, setData] = useState<SoftguardStatusResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  const sondear = useCallback(async () => {
    setCargando(true);
    setFallo(false);
    try {
      const res = await fetch("/api/admin/softguard-status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as SoftguardStatusResponse);
    } catch {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void sondear(); }, [sondear]);

  return (
    <section
      aria-labelledby="sg-modulos-heading"
      className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="sg-modulos-heading" className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Suite web (:8080) — módulos
        </h2>
        <button
          type="button"
          onClick={() => void sondear()}
          disabled={cargando}
          className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-700/60 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} aria-hidden="true" />
          {cargando ? "Sondando…" : "Sondar"}
        </button>
      </div>

      {fallo && (
        <p className="text-sm text-red-400">No se pudo consultar el estado. Reintentá con el botón.</p>
      )}

      {data && !data.configurado && (
        <p className="text-sm text-slate-400">
          API web no configurada — definir <code className="text-slate-300">SOFTGUARD_API_*</code> en{" "}
          <code className="text-slate-300">.env.local</code>.
        </p>
      )}

      {data?.configurado && (
        <>
          {/* Sesión + sondas funcionales */}
          <ul className="space-y-1.5">
            {[data.sesion, ...data.sondas].filter((s): s is SondaResultado => s !== null).map((s) => (
              <li
                key={s.nombre}
                className="flex items-center gap-3 rounded-md border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-xs"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${s.ok ? "bg-emerald-400" : "bg-red-500 animate-led-crit"}`}
                  aria-hidden="true"
                />
                <span className="text-slate-300 font-medium flex-1 min-w-0 truncate">{s.nombre}</span>
                <span className={`truncate max-w-[45%] ${s.ok ? "text-slate-500" : "text-red-400"}`}>
                  {s.ok ? s.detalle : s.error}
                </span>
                <span className="font-mono text-slate-600 tabular-nums shrink-0">{s.ms} ms</span>
              </li>
            ))}
          </ul>

          {/* Catálogo de módulos */}
          {data.modulos.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Módulos del Desktop
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {data.modulos.map((m) => {
                  const enUso = MODULOS_EN_USO.has(m.key);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                        enUso
                          ? "border-orange-700/50 bg-orange-950/30"
                          : "border-slate-700/50 bg-slate-900/40"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          m.disponible ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                        title={m.disponible ? "Disponible" : "No disponible"}
                        aria-hidden="true"
                      />
                      <span className={`flex-1 truncate ${m.disponible ? "text-slate-300" : "text-slate-600"}`}>
                        {m.nombre}
                      </span>
                      {enUso && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-orange-400 shrink-0">
                          En uso
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-600 tabular-nums">
            Última sonda: {new Date(data.at).toLocaleTimeString("es-AR")}
          </p>
        </>
      )}
    </section>
  );
}

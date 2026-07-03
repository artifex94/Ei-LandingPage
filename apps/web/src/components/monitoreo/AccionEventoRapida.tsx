"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstadoEvento } from "@/lib/actions/eventos";

/**
 * Triage rápido de un evento desde la cola de Monitoreo, sin pasar por el admin.
 * "Tomar" lo pone EN_PROCESO; "Resolver" lo cierra como PROCESADO con una nota
 * opcional. La acción está gateada por capacidad (puede_monitorear).
 */
export function AccionEventoRapida({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(false);
  const [nota, setNota] = useState("");

  const enProceso = estado !== "NUEVO" && estado !== "EN_ESPERA";

  function transicionar(nuevoEstado: string, resolucion?: string) {
    setError(null);
    start(async () => {
      const r = await actualizarEstadoEvento(id, nuevoEstado, resolucion);
      if (r?.error) {
        setError(r.error);
      } else {
        setResolviendo(false);
        setNota("");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {!resolviendo ? (
        <div className="flex items-center gap-2">
          {!enProceso && (
            <button
              type="button"
              disabled={pending}
              onClick={() => transicionar("EN_PROCESO")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-950/50 text-blue-300 hover:bg-blue-900/60 disabled:opacity-50 transition-colors min-h-[36px]"
            >
              Tomar
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => setResolviendo(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-950/50 text-green-300 hover:bg-green-900/60 disabled:opacity-50 transition-colors min-h-[36px]"
          >
            Resolver
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota de resolución (opcional)"
            rows={2}
            maxLength={2000}
            className="w-full bg-industrial-900 border border-industrial-700 text-slate-200 placeholder:text-slate-500 rounded-lg px-3 py-2 text-xs focus:outline-2 focus:outline-tactical-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => transicionar("PROCESADO", nota.trim() || undefined)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors min-h-[36px]"
            >
              {pending ? "Guardando…" : "Confirmar resolución"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setResolviendo(false);
                setNota("");
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-industrial-700 text-slate-300 hover:bg-industrial-600 disabled:opacity-50 transition-colors min-h-[36px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

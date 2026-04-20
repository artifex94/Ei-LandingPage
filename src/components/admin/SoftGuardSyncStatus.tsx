"use client";

import { useState } from "react";
import type { SoftGuardResult } from "@/lib/softguard/client";

type PingResponse = {
  ok: boolean;
  mock?: boolean;
  cuentas_count?: number;
  latency_ms?: number;
  error?: string;
};

function StatusBadge({ ok, mock }: { ok: boolean; mock: boolean }) {
  if (mock) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
        Mock
      </span>
    );
  }
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
        Conectado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden="true" />
      Sin conexión
    </span>
  );
}

function toInitialPing(
  result: SoftGuardResult<number>
): PingResponse {
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, mock: result.mock, cuentas_count: result.data };
}

export function SoftGuardPingPanel({
  initialResult,
}: {
  initialResult: SoftGuardResult<number>;
}) {
  const [status, setStatus] = useState<PingResponse>(toInitialPing(initialResult));
  const [loading, setLoading] = useState(false);
  const [lastPing, setLastPing] = useState<Date | null>(null);

  async function handlePing() {
    setLoading(true);
    try {
      const res = await fetch("/api/sync-softguard/ping", { method: "POST" });
      const data: PingResponse = await res.json();
      setStatus(data);
      setLastPing(new Date());
    } catch {
      setStatus({ ok: false, error: "Error de red al contactar el endpoint" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="ping-heading"
      className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-0.5">
          <h2 id="ping-heading" className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Estado de conexión
          </h2>
          {lastPing && (
            <p className="text-xs text-slate-500">
              Último ping:{" "}
              {lastPing.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <StatusBadge ok={status.ok} mock={status.mock ?? false} />
      </div>

      {status.ok && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-700/50 px-3 py-2">
            <dt className="text-xs text-slate-400">Cuentas en vista</dt>
            <dd className="text-lg font-bold text-white mt-0.5">
              {status.cuentas_count ?? "—"}
            </dd>
          </div>
          {status.latency_ms != null && (
            <div className="rounded-md bg-slate-700/50 px-3 py-2">
              <dt className="text-xs text-slate-400">Latencia</dt>
              <dd className="text-lg font-bold text-white mt-0.5">
                {status.latency_ms} ms
              </dd>
            </div>
          )}
          <div className="rounded-md bg-slate-700/50 px-3 py-2">
            <dt className="text-xs text-slate-400">Modo</dt>
            <dd className="text-lg font-bold text-white mt-0.5">
              {status.mock ? "Mock" : "Real"}
            </dd>
          </div>
        </dl>
      )}

      {!status.ok && status.error && (
        <div role="alert" className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
          <p className="text-sm text-red-300">
            <strong className="font-semibold">Error:</strong> {status.error}
          </p>
          <p className="text-xs text-red-400 mt-1">
            Verificar credenciales, conectividad VPN/LAN y que el puerto 1433 esté habilitado.
          </p>
        </div>
      )}

      <button
        onClick={handlePing}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Probando conexión…
          </>
        ) : (
          "Probar conexión"
        )}
      </button>
    </section>
  );
}

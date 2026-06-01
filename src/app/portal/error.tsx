"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Portal Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 max-w-md w-full space-y-4">
        <p className="text-red-400 text-3xl" aria-hidden="true">⚠</p>
        <h1 className="text-xl font-bold text-white">Algo salió mal</h1>
        <p className="text-slate-400 text-sm">
          No se pudo cargar esta página. Intentá de nuevo o volvé al inicio.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-600 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]"
          >
            Reintentar
          </button>
          <Link
            href="/portal/dashboard"
            className="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] flex items-center"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

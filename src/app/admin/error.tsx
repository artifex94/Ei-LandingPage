"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 max-w-md w-full space-y-4">
        <p className="text-red-400 text-4xl" aria-hidden="true">⚠</p>
        <h1 className="text-xl font-bold text-white">Ocurrió un error</h1>
        <p className="text-slate-400 text-sm">
          Algo falló al cargar esta sección. Podés intentar recargar o volver al dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-600 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]"
          >
            Reintentar
          </button>
          <Link
            href="/admin/dashboard"
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] flex items-center"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

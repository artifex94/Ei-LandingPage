"use client";

import { useEffect } from "react";

export default function TecnicoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Tecnico Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-amber-400 text-3xl mb-4" aria-hidden="true">⚠</p>
      <h1 className="text-lg font-bold text-white mb-2">Error al cargar</h1>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">
        No se pudo cargar la información. Si el problema persiste, contactá a Ramiro.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-600 font-mono mb-4">Ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="bg-amber-700 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
      >
        Reintentar
      </button>
    </div>
  );
}

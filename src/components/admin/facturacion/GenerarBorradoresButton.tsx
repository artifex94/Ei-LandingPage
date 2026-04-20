"use client";

import { useState, useTransition } from "react";
import { generarBorradoresMes } from "@/lib/actions/facturacion";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function GenerarBorradoresButton({ anio, mes }: { anio: number; mes: number }) {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ creadas: number; omitidas: number } | null>(null);

  function handleClick() {
    setResultado(null);
    startTransition(async () => {
      const r = await generarBorradoresMes(anio, mes);
      setResultado(r);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {pending ? "Generando…" : `Generar borradores — ${MESES[mes]} ${anio}`}
      </button>
      {resultado && (
        <p className="text-xs text-slate-400">
          {resultado.creadas} creadas · {resultado.omitidas} ya existían
        </p>
      )}
    </div>
  );
}

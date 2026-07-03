"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importarExtracto, type ImportarExtractoResult } from "@/lib/actions/conciliacion";

/**
 * Carga del extracto bancario — Fase 6 (conciliación). Dos formas de entrada:
 * archivo CSV (input file) o pegado directo en un textarea (algunos
 * homebankings solo permiten copiar la grilla, no exportar). Ambas caen en el
 * mismo `importarExtracto`, que es idempotente por hash de línea.
 */
export function ImportarExtractoForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ImportarExtractoResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function importar(contenido: string) {
    setResultado(null);
    startTransition(async () => {
      const res = await importarExtracto(contenido);
      setResultado(res);
      if (res.ok) router.refresh();
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => importar(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <div className="bg-industrial-800 border border-industrial-700 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Importar extracto</h2>
        <p className="text-sm text-slate-400 mt-1">
          Subí el CSV del homebanking o pegá la grilla de movimientos. Solo se importan créditos;
          re-importar el mismo extracto no duplica filas.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors"
        >
          {fileName ? `Archivo: ${fileName}` : "Elegir archivo CSV"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <div>
        <label htmlFor="extracto-pegado" className="block text-sm font-medium text-slate-300 mb-1">
          … o pegá el extracto acá
        </label>
        <textarea
          id="extracto-pegado"
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Fecha;Descripción;Importe&#10;01/07/2026;Transferencia EI-ABC123456789;15000,00"
          className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm font-mono focus:outline-2 focus:outline-orange-500 resize-y"
        />
        <button
          type="button"
          onClick={() => importar(texto)}
          disabled={isPending || !texto.trim()}
          className="mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] transition-colors"
        >
          {isPending ? "Importando…" : "Importar extracto pegado"}
        </button>
      </div>

      {resultado && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            resultado.ok
              ? "bg-green-900/30 border-green-800 text-green-300"
              : "bg-red-900/30 border-red-800 text-red-300"
          }`}
        >
          {resultado.ok ? (
            <p>
              ✓ {resultado.importados} movimiento{resultado.importados !== 1 ? "s" : ""} importado
              {resultado.importados !== 1 ? "s" : ""}
              {resultado.duplicados ? ` · ${resultado.duplicados} ya existía${resultado.duplicados !== 1 ? "n" : ""}` : ""}
              {resultado.erroresParseo && resultado.erroresParseo.length > 0
                ? ` · ${resultado.erroresParseo.length} fila${resultado.erroresParseo.length !== 1 ? "s" : ""} con error`
                : ""}
            </p>
          ) : (
            <p>{resultado.error}</p>
          )}
          {resultado.erroresParseo && resultado.erroresParseo.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium">Ver errores de parseo</summary>
              <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside">
                {resultado.erroresParseo.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

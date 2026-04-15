"use client";

import { useRef, useState, useTransition } from "react";
import { importarCsvSoftguard, type ImportResult } from "@/app/admin/importar/actions";

export function CsvUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const formData = new FormData();
    formData.append("csv", file);

    startTransition(async () => {
      const res = await importarCsvSoftguard(formData);
      setResult(res);
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={isPending}
        aria-label="Seleccionar archivo CSV"
        className={[
          "w-full border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
          dragging
            ? "border-orange-500 bg-orange-500/10"
            : "border-slate-600 hover:border-slate-500 bg-slate-700/30",
          isPending ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <p className="text-slate-300 text-sm">
          {isPending
            ? "Procesando…"
            : fileName
            ? `Archivo: ${fileName}`
            : "Arrastrá el CSV acá o hacé clic para seleccionarlo"}
        </p>
        {!isPending && (
          <p className="text-xs text-slate-500 mt-1">Solo archivos .csv</p>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Resultados */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-green-400 font-semibold text-sm">
              ✓ {result.ok} fila{result.ok !== 1 ? "s" : ""} importada
              {result.ok !== 1 ? "s" : ""}
            </span>
            {result.errores.length > 0 && (
              <span className="text-red-400 text-sm">
                · {result.errores.length} error{result.errores.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>

          {result.errores.length > 0 && (
            <details className="bg-red-900/30 border border-red-800 rounded-lg p-3">
              <summary className="text-sm font-medium text-red-400 cursor-pointer">
                Ver errores ({result.errores.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-red-300 list-disc list-inside">
                {result.errores.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}

          <button
            type="button"
            onClick={() => {
              setResult(null);
              setFileName(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-sm text-slate-400 hover:text-slate-200 underline transition-colors"
          >
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  );
}

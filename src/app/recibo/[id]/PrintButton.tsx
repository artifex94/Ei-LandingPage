"use client";

export function PrintButton() {
  return (
    <div className="print:hidden fixed top-4 right-4 z-10">
      <button
        onClick={() => window.print()}
        className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors shadow"
      >
        Imprimir / Guardar PDF
      </button>
    </div>
  );
}

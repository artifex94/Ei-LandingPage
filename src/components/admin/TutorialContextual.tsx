"use client";

import { useState, useEffect } from "react";
import { X, HelpCircle } from "lucide-react";

interface Step {
  titulo: string;
  descripcion: string;
}

interface Props {
  section: string;
  titulo: string;
  steps: Step[];
}

export function TutorialContextual({ section, titulo, steps }: Props) {
  const [open, setOpen] = useState(false);
  const [visto, setVisto] = useState(true); // true = ya fue visto (no pulsar)
  const [mounted, setMounted] = useState(false);

  const storageKey = `admin_tutorial_seen_${section}`;

  useEffect(() => {
    setMounted(true);
    setVisto(!!localStorage.getItem(storageKey));
  }, [storageKey]);

  function abrir() {
    setOpen(true);
    if (!visto) {
      setVisto(true);
      localStorage.setItem(storageKey, "1");
    }
  }

  function cerrar() {
    setOpen(false);
    if (!visto) {
      setVisto(true);
      localStorage.setItem(storageKey, "1");
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Botón flotante — pulsa si es la primera vez */}
      <div className="fixed bottom-6 right-6 z-40">
        {!visto && (
          <span
            className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping"
            aria-hidden="true"
          />
        )}
        <button
          onClick={() => (open ? cerrar() : abrir())}
          aria-label={open ? "Cerrar guía rápida" : "Abrir guía rápida"}
          aria-expanded={open}
          className={`relative w-11 h-11 rounded-full border flex items-center justify-center shadow-xl transition-colors ${
            !visto
              ? "bg-orange-500/20 border-orange-500/50 text-orange-300 hover:bg-orange-500/30"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-labelledby={`tutorial-title-${section}`}
          aria-modal="false"
          className="fixed bottom-20 right-6 z-40 w-80 rounded-xl border border-slate-700 bg-slate-800/95 backdrop-blur-sm shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <span
                id={`tutorial-title-${section}`}
                className="text-sm font-semibold text-white"
              >
                {titulo}
              </span>
            </div>
            <button
              onClick={cerrar}
              aria-label="Cerrar guía"
              className="text-slate-500 hover:text-white transition-colors p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ol className="px-4 py-3 space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center mt-0.5"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{step.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {step.descripcion}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="px-4 pb-3 border-t border-slate-700/60 pt-2">
            <button
              onClick={cerrar}
              className="w-full text-xs font-semibold text-slate-500 hover:text-white py-1.5 transition-colors"
            >
              Entendido — cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

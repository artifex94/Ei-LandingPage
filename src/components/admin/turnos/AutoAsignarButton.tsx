"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { autoAsignarSemana } from "@/lib/actions/turnos";

export function AutoAsignarButton({
  semanaDesde,
  huecos,
}: {
  semanaDesde: string;
  /** Cantidad de franjas sin cobertura en la semana visible. */
  huecos: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  function ejecutar() {
    setResultado(null);
    startTransition(async () => {
      try {
        const res = await autoAsignarSemana(semanaDesde);
        setConfirmar(false);
        if (res.creados > 0) {
          setResultado(`✓ ${res.creados} turno${res.creados !== 1 ? "s" : ""} asignado${res.creados !== 1 ? "s" : ""} automáticamente`);
          router.refresh();
        } else {
          setResultado(res.mensaje ?? "La semana ya está cubierta.");
        }
        setTimeout(() => setResultado(null), 4000);
      } catch {
        setConfirmar(false);
        setResultado("No se pudo completar la asignación.");
        setTimeout(() => setResultado(null), 4000);
      }
    });
  }

  const todoCubierto = huecos === 0;

  return (
    <div className="relative">
      <button
        onClick={() => setConfirmar(true)}
        disabled={pending || todoCubierto}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
          todoCubierto
            ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
            : "bg-orange-500 hover:bg-orange-600 text-slate-900"
        }`}
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        {todoCubierto ? "Semana cubierta" : `Auto-asignar (${huecos})`}
      </button>

      {/* Confirmación */}
      {confirmar && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => !pending && setConfirmar(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Confirmar auto-asignación"
            className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-slate-600 bg-slate-800 shadow-2xl p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white">Auto-asignar turnos</h3>
              </div>
              <button
                onClick={() => setConfirmar(false)}
                disabled={pending}
                aria-label="Cancelar"
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-1">
              Se repartirán <strong className="text-slate-200">{huecos} franja{huecos !== 1 ? "s" : ""}</strong> sin cubrir entre los monitores activos, balanceando la carga.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Respeta ausencias, turnos ya asignados y el descanso post-noche. Podés ajustar el resultado manualmente.
            </p>

            <div className="flex gap-2">
              <button
                onClick={ejecutar}
                disabled={pending}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-slate-900 text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                {pending ? "Asignando…" : "Confirmar"}
              </button>
              <button
                onClick={() => setConfirmar(false)}
                disabled={pending}
                className="px-4 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast de resultado */}
      {resultado && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 shadow-xl whitespace-nowrap">
          {resultado}
        </div>
      )}
    </div>
  );
}

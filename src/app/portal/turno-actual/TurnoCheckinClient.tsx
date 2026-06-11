"use client";

import { useState, useTransition } from "react";
import { checkinTurno, checkoutTurno } from "@/lib/actions/turnos";

export function TurnoCheckinClient({
  turnoId,
  franja,
  estado: estadoInicial,
  checkinAt: checkinInicial,
  checkoutAt: checkoutInicial,
}: {
  turnoId: string;
  franja: string;
  estado: string;
  checkinAt: string | null;
  checkoutAt: string | null;
}) {
  const [estado, setEstado] = useState(estadoInicial);
  const [checkinAt, setCheckinAt] = useState(checkinInicial);
  const [checkoutAt, setCheckoutAt] = useState(checkoutInicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCheckin() {
    setError(null);
    startTransition(async () => {
      const res = await checkinTurno(turnoId);
      if (res?.error) { setError(res.error); return; }
      setEstado("EN_CURSO");
      setCheckinAt(new Date().toISOString());
    });
  }

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const res = await checkoutTurno(turnoId);
      if (res?.error) { setError(res.error); return; }
      setEstado("COMPLETADO");
      setCheckoutAt(new Date().toISOString());
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-industrial-700 bg-industrial-800/80 shadow-[0_8px_24px_rgba(0,0,0,0.4)] p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Turno asignado</p>
        <p className="text-lg font-bold text-white">{franja}</p>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className={`rounded-lg p-3 text-center ${checkinAt ? "bg-industrial-800 border border-industrial-700" : "bg-industrial-800/40 border border-industrial-800"}`}>
            <p className="text-xs text-slate-400">Inicio</p>
            <p className={`text-sm font-bold ${checkinAt ? "text-white" : "text-slate-700"}`}>
              {checkinAt ? fmt(checkinAt) : "—"}
            </p>
          </div>
          <div className={`rounded-lg p-3 text-center ${checkoutAt ? "bg-industrial-800 border border-industrial-700" : "bg-industrial-800/40 border border-industrial-800"}`}>
            <p className="text-xs text-slate-400">Fin</p>
            <p className={`text-sm font-bold ${checkoutAt ? "text-white" : "text-slate-700"}`}>
              {checkoutAt ? fmt(checkoutAt) : "—"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {estado === "PROGRAMADO" && (
        <button
          onClick={handleCheckin}
          disabled={pending}
          className="w-full py-4 rounded-sm bg-tactical-500 hover:bg-tactical-400 border border-tactical-600 border-b-[4px] border-b-tactical-600 active:border-b active:translate-y-[3px] text-slate-900 font-bold uppercase tracking-widest text-sm disabled:opacity-50 transition-all duration-150 ease-mech-press"
        >
          Iniciar turno
        </button>
      )}

      {estado === "EN_CURSO" && (
        <button
          onClick={handleCheckout}
          disabled={pending}
          className="w-full py-4 rounded-sm bg-emerald-600 hover:bg-emerald-500 border border-emerald-700 border-b-[4px] border-b-emerald-900 active:border-b active:translate-y-[3px] text-white font-bold uppercase tracking-widest text-sm disabled:opacity-50 transition-all duration-150 ease-mech-press"
        >
          Cerrar turno
        </button>
      )}

      {estado === "COMPLETADO" && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-700 p-4 text-center">
          <p className="text-emerald-400 font-bold">Turno completado</p>
          {checkoutAt && (
            <p className="text-xs text-emerald-600 mt-1">Cerrado a las {fmt(checkoutAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}

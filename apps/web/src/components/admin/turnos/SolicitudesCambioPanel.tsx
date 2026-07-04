"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import Select from "@/components/ui/Select";
import { resolverSolicitudCambioTurno } from "@/lib/actions/turnos";

interface SolicitudRow {
  id: string;
  solicitanteNombre: string;
  fechaLabel: string;
  franjaLabel: string;
  motivo: string;
  reemplazoPropuestoId: string | null;
  reemplazoPropuestoNombre: string | null;
}

interface Companero {
  id: string;
  nombre: string;
}

interface Props {
  solicitudes: SolicitudRow[];
  monitores: Companero[];
}

function FilaSolicitud({ s, monitores }: { s: SolicitudRow; monitores: Companero[] }) {
  const router = useRouter();
  const [reemplazoId, setReemplazoId] = useState(s.reemplazoPropuestoId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resolver(decision: "APROBADA" | "RECHAZADA") {
    setError(null);
    startTransition(async () => {
      const r = await resolverSolicitudCambioTurno({
        solicitudId: s.id,
        decision,
        reemplazoId: decision === "APROBADA" && reemplazoId ? reemplazoId : undefined,
      });
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-slate-700/40 bg-slate-900/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {s.solicitanteNombre}
            <span className="font-normal text-slate-400"> — {s.fechaLabel} · {s.franjaLabel}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">“{s.motivo}”</p>
          {s.reemplazoPropuestoNombre && (
            <p className="text-xs text-slate-500 mt-0.5">Propone que cubra: {s.reemplazoPropuestoNombre}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor={`reemplazo-${s.id}`} className="sr-only">
            Quién cubre el turno
          </label>
          <Select
            id={`reemplazo-${s.id}`}
            value={reemplazoId}
            onChange={(e) => setReemplazoId(e.target.value)}
            className="!w-auto text-xs"
          >
            <option value="">Sin reemplazo (lo cubre el auto-asignador)</option>
            {monitores.map((m) => (
              <option key={m.id} value={m.id}>
                Cubre: {m.nombre}
              </option>
            ))}
          </Select>
          <button
            type="button"
            disabled={pending}
            onClick={() => resolver("APROBADA")}
            className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-950/70 min-h-[44px] transition-colors disabled:opacity-50"
          >
            ✓ Aprobar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => resolver("RECHAZADA")}
            className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 min-h-[44px] transition-colors disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400 mt-2">
          {error}
        </p>
      )}
    </li>
  );
}

export function SolicitudesCambioPanel({ solicitudes, monitores }: Props) {
  if (solicitudes.length === 0) return null;

  return (
    <section
      aria-labelledby="solicitudes-cambio-heading"
      className="rounded-xl border border-amber-700/50 bg-amber-950/15 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-amber-800/40">
        <CalendarClock className="w-4 h-4 text-amber-400" aria-hidden="true" />
        <h2 id="solicitudes-cambio-heading" className="text-sm font-semibold text-white">
          Solicitudes de cambio de turno
          <span className="ml-2 rounded-md bg-amber-900/60 px-1.5 py-0.5 text-xs font-bold text-amber-300 tabular-nums">
            {solicitudes.length}
          </span>
        </h2>
      </div>
      <ul role="list" className="space-y-2">
        {solicitudes.map((s) => (
          <FilaSolicitud key={s.id} s={s} monitores={monitores} />
        ))}
      </ul>
    </section>
  );
}

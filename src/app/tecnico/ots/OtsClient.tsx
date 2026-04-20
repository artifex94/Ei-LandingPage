"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import {
  Zap, Wrench, Shield, ArrowDownLeft,
  CheckCircle2, Clock, MapPin, ChevronDown, ChevronUp,
  Loader2,
} from "lucide-react";
import { aceptarOT, liberarOT } from "@/lib/actions/ot-accept";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface OTCard {
  id:          string;
  numero:      number;
  tipo:        string;
  descripcion: string;
  prioridad:   string;
  estado:      string;
  fecha_visita: string | null;
  cliente:     string;
  direccion:   string | null;
  telefono:    string | null;
  // solo para "Mis OTs"
  tarea_id:   string | null;
}

interface Props {
  disponibles: OTCard[];
  misOTs:      OTCard[];
  tieneEmpleado: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  INSTALACION: "Instalación",
  CORRECTIVO:  "Correctivo",
  PREVENTIVO:  "Preventivo",
  RETIRO:      "Retiro",
};

const TIPO_ICON: Record<string, React.ReactNode> = {
  INSTALACION: <Zap       className="w-4 h-4" />,
  CORRECTIVO:  <Wrench    className="w-4 h-4" />,
  PREVENTIVO:  <Shield    className="w-4 h-4" />,
  RETIRO:      <ArrowDownLeft className="w-4 h-4" />,
};

const PRIORIDAD_BADGE: Record<string, string> = {
  ALTA:  "bg-red-900/40 text-red-400 border border-red-700/40",
  MEDIA: "bg-amber-900/30 text-amber-400 border border-amber-700/40",
  BAJA:  "bg-slate-800 text-slate-500 border border-slate-700",
};

const ESTADO_BADGE: Record<string, string> = {
  ASIGNADA: "bg-blue-900/30 text-blue-300 border border-blue-700/40",
  EN_RUTA:  "bg-indigo-900/30 text-indigo-300 border border-indigo-700/40",
  EN_SITIO: "bg-emerald-900/30 text-emerald-300 border border-emerald-700/40",
};

const ESTADO_LABEL: Record<string, string> = {
  ASIGNADA: "Asignada",
  EN_RUTA:  "En ruta",
  EN_SITIO: "En sitio",
};

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function formatHora(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours();
  const mm = d.getMinutes();
  if (hh === 0 && mm === 0) return null;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

// ── Tarjeta OT disponible ──────────────────────────────────────────────────────

function TarjetaDisponible({ ot, onAceptar, cargando }: {
  ot: OTCard;
  onAceptar: (id: string) => void;
  cargando: boolean;
}) {
  const [expandida, setExpandida] = useState(false);
  const hora = ot.fecha_visita ? formatHora(ot.fecha_visita) : null;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-start gap-3 p-4">
        <div className="h-9 w-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-slate-400">
          {TIPO_ICON[ot.tipo]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-xs text-slate-500 font-mono">#{String(ot.numero).padStart(4, "0")}</span>
            <span className="text-xs font-medium text-slate-300">{TIPO_LABEL[ot.tipo]}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORIDAD_BADGE[ot.prioridad]}`}>
              {ot.prioridad}
            </span>
          </div>
          <p className="text-sm font-semibold text-white leading-tight">{ot.cliente}</p>
          {ot.direccion && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <p className="text-xs text-slate-400 truncate">{ot.direccion}</p>
            </div>
          )}
          {ot.fecha_visita && (
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3 text-indigo-400 flex-shrink-0" />
              <span className="text-xs text-indigo-300">
                {formatFecha(ot.fecha_visita)}{hora ? ` · ${hora}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Descripción expandible */}
      <button
        onClick={() => setExpandida((v) => !v)}
        className="w-full flex items-center justify-between px-4 pb-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <span className={expandida ? "" : "truncate max-w-[80%] text-left"}>{ot.descripcion}</span>
        {expandida ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
      </button>

      {/* Acciones */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
        {ot.telefono ? (
          <a
            href={`https://wa.me/549${ot.telefono.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            WhatsApp ↗
          </a>
        ) : (
          <span />
        )}
        <button
          disabled={cargando}
          onClick={() => onAceptar(ot.id)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
        >
          {cargando ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          Aceptar
        </button>
      </div>
    </div>
  );
}

// ── Tarjeta "Mis OTs" ──────────────────────────────────────────────────────────

function TarjetaMia({ ot, onLiberar, cargando }: {
  ot: OTCard;
  onLiberar: (id: string) => void;
  cargando: boolean;
}) {
  const hora = ot.fecha_visita ? formatHora(ot.fecha_visita) : null;
  const puedeLiberar = ot.estado === "ASIGNADA";

  return (
    <div className={`rounded-xl border overflow-hidden ${
      ot.estado === "EN_SITIO" ? "border-emerald-700/40" :
      ot.estado === "EN_RUTA"  ? "border-indigo-700/40"  :
      "border-slate-700/50"
    } bg-slate-800/30`}>
      <div className="flex items-start gap-3 p-4">
        <div className="h-9 w-9 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0 text-slate-400">
          {TIPO_ICON[ot.tipo]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-xs text-slate-500 font-mono">#{String(ot.numero).padStart(4, "0")}</span>
            <span className="text-xs font-medium text-slate-300">{TIPO_LABEL[ot.tipo]}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_BADGE[ot.estado] ?? ""}`}>
              {ESTADO_LABEL[ot.estado]}
            </span>
          </div>
          <p className="text-sm font-semibold text-white leading-tight">{ot.cliente}</p>
          {ot.direccion && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <p className="text-xs text-slate-400 truncate">{ot.direccion}</p>
            </div>
          )}
          {ot.fecha_visita && (
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3 text-indigo-400 flex-shrink-0" />
              <span className="text-xs text-indigo-300">
                {formatFecha(ot.fecha_visita)}{hora ? ` · ${hora}` : ""}
              </span>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ot.descripcion}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/40 bg-slate-900/20">
        <Link
          href={`/tecnico/ot/${ot.id}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
        >
          Ver detalle →
        </Link>
        {puedeLiberar && (
          <button
            disabled={cargando}
            onClick={() => onLiberar(ot.id)}
            className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-40 transition-colors px-2 py-1 rounded hover:bg-slate-800"
          >
            {cargando ? "…" : "Liberar"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componente raíz ────────────────────────────────────────────────────────────

export function OtsClient({ disponibles, misOTs, tieneEmpleado }: Props) {
  const [pending, startTransition] = useTransition();
  const [otEnProceso, setOtEnProceso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAceptar = (id: string) => {
    setError(null);
    setOtEnProceso(id);
    startTransition(async () => {
      const res = await aceptarOT(id);
      if (!res.ok) setError(res.error ?? "Error al aceptar la OT.");
      setOtEnProceso(null);
    });
  };

  const handleLiberar = (id: string) => {
    setError(null);
    setOtEnProceso(id);
    startTransition(async () => {
      const res = await liberarOT(id);
      if (!res.ok) setError(res.error ?? "Error al liberar la OT.");
      setOtEnProceso(null);
    });
  };

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-white">Órdenes de trabajo</h1>
        <p className="text-sm text-slate-400 mt-0.5">Tomá una OT disponible para agregarla a tu agenda</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!tieneEmpleado && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          Necesitás un registro de empleado para aceptar OTs. Consultá al administrador.
        </div>
      )}

      {/* ── OTs disponibles ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Disponibles</h2>
          {disponibles.length > 0 && (
            <span className="bg-indigo-600/30 text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-full">
              {disponibles.length}
            </span>
          )}
        </div>

        {disponibles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center">
            <p className="text-sm text-slate-500">No hay OTs disponibles en este momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disponibles.map((ot) => (
              <TarjetaDisponible
                key={ot.id}
                ot={ot}
                onAceptar={handleAceptar}
                cargando={pending && otEnProceso === ot.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Mis OTs activas ── */}
      {misOTs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Mis OTs activas</h2>
            <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
              {misOTs.length}
            </span>
          </div>
          <div className="space-y-3">
            {misOTs.map((ot) => (
              <TarjetaMia
                key={ot.id}
                ot={ot}
                onLiberar={handleLiberar}
                cargando={pending && otEnProceso === ot.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

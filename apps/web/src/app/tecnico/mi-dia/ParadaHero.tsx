import Link from "next/link";
import { CheckCircle2, Coffee, MapPin, Phone, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TIPO_OT_LABEL, ESTADO_PARADA_LABEL } from "./parada-ui";
import type { Parada } from "./paradas";

interface Props {
  parada: Parada | null;
  esAhora: boolean;
  totalParadas: number;
}

/**
 * Tarjeta principal del run sheet: la parada en curso (AHORA) o la próxima
 * pendiente (SIGUIENTE), con las tres acciones de campo a mano:
 * cómo llegar, llamar y abrir el detalle.
 */
export function ParadaHero({ parada, esAhora, totalParadas }: Props) {
  if (!parada) {
    return totalParadas > 0 ? (
      <EmptyState
        icon={CheckCircle2}
        tone="success"
        eyebrow="Jornada completa"
        title="Terminaste todas las paradas de hoy."
        description="Buen trabajo. Revisá mañana en Mi semana."
      />
    ) : (
      <EmptyState
        icon={Coffee}
        title="No tenés paradas asignadas para hoy."
        description="Cuando te asignen una tarea o una OT aparece acá."
      />
    );
  }

  const telDigits = parada.telefono?.replace(/\D/g, "") ?? null;

  return (
    <section
      aria-label={esAhora ? "Parada en curso" : "Próxima parada"}
      className={`rounded-xl border bg-industrial-800/55 p-4 sm:p-5 ${
        esAhora ? "border-tactical-500/40" : "border-industrial-700"
      }`}
    >
      {/* Eyebrow + hora */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
              esAhora ? "bg-tactical-500 animate-led-alert" : "bg-blue-400 animate-led-idle"
            }`}
            aria-hidden="true"
          />
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
              esAhora ? "text-tactical-400" : "text-slate-400"
            }`}
          >
            {esAhora ? "Ahora" : "Siguiente"}
          </span>
          {parada.tipoOT && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
              · {TIPO_OT_LABEL[parada.tipoOT] ?? parada.tipoOT}
              {parada.numeroOT !== null && ` #${String(parada.numeroOT).padStart(4, "0")}`}
            </span>
          )}
        </div>
        {parada.hora && (
          <span className="text-xl font-mono font-bold tabular-nums text-white flex-shrink-0">
            {parada.hora}
          </span>
        )}
      </div>

      {/* Título + estado + dirección */}
      <p className="text-lg font-display font-bold text-white leading-snug">
        {parada.titulo}
      </p>
      <p className="text-xs text-slate-400 mt-1">
        {ESTADO_PARADA_LABEL[parada.estado] ?? parada.estado}
        {parada.direccion && <> · {parada.direccion}</>}
      </p>

      {/* CTAs de campo */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {parada.direccion ? (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(parada.direccion)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-lg
                       bg-tactical-500 hover:bg-tactical-400 text-slate-900
                       border border-tactical-600/70 text-xs font-semibold
                       transition-colors"
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            Cómo llegar
          </a>
        ) : (
          <span className="flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-sm bg-industrial-800 border border-industrial-700 text-slate-600 text-[11px] font-bold uppercase tracking-widest">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            Sin dirección
          </span>
        )}

        {telDigits ? (
          <a
            href={`tel:+549${telDigits}`}
            className="flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-lg
                       bg-industrial-700 hover:bg-industrial-600 text-slate-200
                       border border-industrial-600 text-xs font-semibold
                       transition-colors"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            Llamar
          </a>
        ) : (
          <span className="flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-sm bg-industrial-800 border border-industrial-700 text-slate-600 text-[11px] font-bold uppercase tracking-widest">
            <Phone className="w-4 h-4" aria-hidden="true" />
            Sin teléfono
          </span>
        )}

        <Link
          href={parada.href}
          className="flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-lg
                     bg-industrial-700 hover:bg-industrial-600 text-slate-200
                     border border-industrial-600 text-xs font-semibold
                     transition-colors"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          Abrir
        </Link>
      </div>
    </section>
  );
}

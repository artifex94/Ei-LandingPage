"use client";

import Link from "next/link";
import type { DayForecast } from "@/lib/weather";
import { CONDITION_THEME } from "@/lib/weather";
import { WeatherParticles } from "@/components/admin/WeatherParticles";

type TareaCompact = {
  id: string;
  titulo: string;
  hora_inicio: string | null;
  estado: string;
  prioridad: string;
  cuenta?: { calle: string | null } | null;
};

const PRIORIDAD_BORDER: Record<string, string> = {
  ALTA:  "border-l-red-500",
  MEDIA: "border-l-amber-500",
  BAJA:  "border-l-slate-500",
};

const ESTADO_DOT: Record<string, string> = {
  PENDIENTE:  "bg-slate-400",
  EN_CURSO:   "bg-sky-400",
  COMPLETADA: "bg-emerald-400",
};

const SAFETY_LABEL: Record<string, string> = {
  green:  "Condiciones seguras para trabajo exterior",
  yellow: "Precaución: condiciones moderadamente adversas",
  red:    "Riesgo alto: evitar trabajo exterior",
};

const SAFETY_COLOR: Record<string, string> = {
  green:  "#22c55e",
  yellow: "#eab308",
  red:    "#ef4444",
};

type Props = {
  dayLabel:   string;
  dayNumber:  string;
  monthLabel: string;
  esHoy:      boolean;
  tareas:     TareaCompact[];
  completadas: number;
  weather:    DayForecast | null;
};

export function DayCard({ dayLabel, dayNumber, monthLabel, esHoy, tareas, completadas, weather }: Props) {
  const theme  = weather ? CONDITION_THEME[weather.condition] : null;
  const tw     = theme?.lightText ?? true;

  const safetyColor = weather ? SAFETY_COLOR[weather.safetyLevel] : null;
  const safetyLabel = weather ? SAFETY_LABEL[weather.safetyLevel] : null;

  return (
    <div
      className={`relative flex flex-col rounded-2xl overflow-hidden select-none transition-transform duration-200 ${
        esHoy ? "ring-2 ring-white/50 shadow-2xl scale-[1.02]" : "shadow-lg"
      }`}
      style={{
        minHeight: "220px",
        background: theme
          ? `linear-gradient(155deg, ${theme.gradientFrom} 0%, ${theme.gradientTo} 100%)`
          : "linear-gradient(155deg, #1e293b 0%, #0f172a 100%)",
      }}
      role="article"
      aria-label={`${esHoy ? "Hoy" : dayLabel} ${dayNumber}: ${tareas.length} tarea${tareas.length !== 1 ? "s" : ""}`}
    >
      {/* Partículas meteorológicas */}
      {weather && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <WeatherParticles condition={weather.condition} />
        </div>
      )}

      {/* Indicador de seguridad */}
      {safetyColor && (
        <div
          className="absolute top-2.5 right-2.5 z-30 rounded-full"
          style={{
            width: "10px",
            height: "10px",
            background: safetyColor,
            boxShadow: `0 0 6px ${safetyColor}`,
            animation: weather?.safetyLevel === "red" ? "safety-pulse 1.6s ease-in-out infinite" : undefined,
          }}
          title={safetyLabel ?? undefined}
          aria-label={safetyLabel ?? undefined}
        />
      )}

      {/* Contenido */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Cabecera: día */}
        <div className="px-3 pt-3 pb-1.5">
          <p
            className="text-[9px] font-black uppercase tracking-[0.15em] leading-none"
            style={{ color: tw ? "rgba(255,255,255,0.65)" : "rgba(30,41,59,0.65)" }}
          >
            {esHoy ? "HOY" : dayLabel}
          </p>
          <p
            className="text-2xl font-black leading-tight"
            style={{ color: tw ? "#ffffff" : "#0f172a" }}
          >
            {dayNumber}
          </p>
          <p
            className="text-[9px] leading-none -mt-0.5"
            style={{ color: tw ? "rgba(255,255,255,0.55)" : "rgba(30,41,59,0.5)" }}
          >
            {monthLabel}
          </p>
        </div>

        {/* Resumen meteorológico */}
        {weather && theme && (
          <div className="px-3 pb-2 flex items-center gap-1.5">
            <span className="text-base leading-none" aria-hidden="true">{theme.emoji}</span>
            <div>
              <p
                className="text-[9px] font-semibold leading-tight"
                style={{ color: tw ? "rgba(255,255,255,0.85)" : "rgba(30,41,59,0.75)" }}
              >
                {weather.maxTemp}°/{weather.minTemp}°
              </p>
              <p
                className="text-[8px] leading-none"
                style={{ color: tw ? "rgba(255,255,255,0.5)" : "rgba(30,41,59,0.45)" }}
              >
                💨{weather.maxWind} · 🌧{weather.precipProbability}%
              </p>
            </div>
          </div>
        )}

        {/* Panel de tareas */}
        <div
          className="flex-1 mx-2 mb-2 rounded-xl overflow-hidden flex flex-col"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          {tareas.length === 0 ? (
            <p
              className="text-center text-[10px] py-4"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Sin tareas
            </p>
          ) : (
            <div className="flex-1 p-1 space-y-1">
              {tareas.map((t) => (
                <Link
                  key={t.id}
                  href={`/tecnico/tareas/${t.id}`}
                  className={`block rounded border-l-2 px-1.5 py-1 hover:brightness-125 transition-all ${PRIORIDAD_BORDER[t.prioridad] ?? "border-l-slate-600"} ${t.estado === "COMPLETADA" ? "opacity-40" : ""}`}
                  style={{ background: "rgba(0,0,0,0.30)" }}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ESTADO_DOT[t.estado] ?? "bg-slate-500"}`} />
                    {t.hora_inicio && (
                      <span
                        className="font-mono text-[9px]"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        {t.hora_inicio}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-white leading-tight line-clamp-2">
                    {t.titulo}
                  </p>
                  {t.cuenta?.calle && (
                    <p
                      className="text-[9px] mt-0.5 truncate"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {t.cuenta.calle}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}

          {tareas.length > 0 && (
            <div
              className="px-2 py-1 text-[9px] flex justify-between border-t border-white/10 flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              <span>{tareas.length} tarea{tareas.length !== 1 ? "s" : ""}</span>
              {completadas > 0 && (
                <span style={{ color: "rgba(110,231,183,0.9)" }}>{completadas} ✓</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overlay inferior de profundidad */}
      <div
        className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-2xl"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.2), transparent)" }}
      />
    </div>
  );
}

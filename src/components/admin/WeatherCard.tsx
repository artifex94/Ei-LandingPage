"use client";

import type { DayForecast, WeatherCondition } from "@/lib/weather";
import { CONDITION_THEME } from "@/lib/weather";

// Posiciones fijas para evitar problemas de hidratación
const COLS = [6, 13, 20, 28, 36, 44, 52, 60, 67, 75, 82, 90];
const DELAYS = [0, 0.22, 0.44, 0.11, 0.66, 0.33, 0.55, 0.77, 0.18, 0.50, 0.27, 0.88];

// ── Capas de partículas por condición ─────────────────────────────────────────

function ParticlesRain({ n = 12, dur = "1.25s" }: { n?: number; dur?: string }) {
  return (
    <>
      {COLS.slice(0, n).map((left, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${left}%`,
            top: "-8%",
            width: "1px",
            height: dur === "1.25s" ? "14px" : "9px",
            background: dur === "1.25s"
              ? "rgba(147,197,253,0.75)"
              : "rgba(186,230,253,0.55)",
            animation: `rain-fall ${dur} linear infinite`,
            animationDelay: `${DELAYS[i]}s`,
          }}
        />
      ))}
    </>
  );
}

function ParticlesHail() {
  return (
    <>
      {COLS.slice(0, 12).map((left, i) => (
        <span
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${left}%`,
            top: "-6%",
            width: "4px",
            height: "4px",
            background: "rgba(203,213,225,0.9)",
            animation: `hail-fall 0.65s linear infinite`,
            animationDelay: `${DELAYS[i] * 0.8}s`,
          }}
        />
      ))}
      {/* Líneas de lluvia tras el granizo */}
      {COLS.slice(0, 8).map((left, i) => (
        <span
          key={`r${i}`}
          className="absolute rounded-full"
          style={{
            left: `${left + 3}%`,
            top: "-8%",
            width: "1px",
            height: "10px",
            background: "rgba(147,197,253,0.5)",
            animation: `rain-fall 1.1s linear infinite`,
            animationDelay: `${DELAYS[i] + 0.3}s`,
          }}
        />
      ))}
    </>
  );
}

function ParticlesSnow() {
  const sizes = [6, 5, 7, 5, 6, 8, 5, 6, 7, 5];
  return (
    <>
      {COLS.slice(0, 10).map((left, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${left}%`,
            top: "-5%",
            width: `${sizes[i]}px`,
            height: `${sizes[i]}px`,
            background: "rgba(255,255,255,0.85)",
            animation: `snow-drift ${1.8 + (i % 3) * 0.6}s ease-in infinite`,
            animationDelay: `${DELAYS[i] * 1.2}s`,
          }}
        />
      ))}
    </>
  );
}

function ParticlesSun() {
  return (
    <>
      {/* Rayos rotando — cono de gradiente */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "200px",
          height: "200px",
          top: "50%",
          left: "50%",
          background:
            "conic-gradient(transparent 0deg, rgba(255,220,60,0.18) 20deg, transparent 40deg, rgba(255,220,60,0.18) 60deg, transparent 80deg, rgba(255,220,60,0.18) 100deg, transparent 120deg, rgba(255,220,60,0.18) 140deg, transparent 160deg, rgba(255,220,60,0.18) 180deg, transparent 200deg, rgba(255,220,60,0.18) 220deg, transparent 240deg, rgba(255,220,60,0.18) 260deg, transparent 280deg, rgba(255,220,60,0.18) 300deg, transparent 320deg, rgba(255,220,60,0.18) 340deg, transparent 360deg)",
          animation: "sun-ray-rotate 10s linear infinite",
          borderRadius: "50%",
        }}
      />
      {/* Halo cálido central */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: "70px",
          height: "70px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(255,220,80,0.25) 0%, transparent 70%)",
        }}
      />
    </>
  );
}

function ParticlesHeat({ extreme }: { extreme: boolean }) {
  const color = extreme
    ? "rgba(239,68,68,0.4)"
    : "rgba(251,191,36,0.35)";
  const tops = [18, 34, 51, 68, 82];
  return (
    <>
      {tops.map((top, i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{
            height: "2px",
            top: `${top}%`,
            background: `linear-gradient(90deg, transparent 0%, ${color} 25%, rgba(255,100,20,${extreme ? 0.55 : 0.45}) 50%, ${color} 75%, transparent 100%)`,
            filter: "blur(1.5px)",
            animation: `heat-shimmer ${1.6 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.35}s`,
          }}
        />
      ))}
      {/* Brillo difuso inferior */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "40%",
          background: `linear-gradient(to top, ${extreme ? "rgba(127,29,29,0.3)" : "rgba(180,83,9,0.2)"}, transparent)`,
        }}
      />
    </>
  );
}

function ParticlesClouds({ partly }: { partly: boolean }) {
  const blobs = partly
    ? [
        { w: 70, h: 22, top: 10, left: -8, delay: 0 },
        { w: 50, h: 16, top: 28, left: 20, delay: 1.2 },
      ]
    : [
        { w: 85, h: 26, top: 5,  left: -12, delay: 0 },
        { w: 65, h: 20, top: 20, left: 10,  delay: 0.8 },
        { w: 55, h: 18, top: 38, left: -5,  delay: 1.6 },
      ];
  return (
    <>
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${b.w}px`,
            height: `${b.h}px`,
            top: `${b.top}%`,
            left: `${b.left}%`,
            background: partly
              ? "rgba(255,255,255,0.12)"
              : "rgba(148,163,184,0.15)",
            filter: "blur(4px)",
            animation: `cloud-float ${3.5 + i * 0.8}s ease-in-out infinite`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function ParticlesLightning() {
  return (
    <>
      <ParticlesRain n={10} dur="1.15s" />
      {/* Flash de relámpago */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgba(200,180,255,0.6)",
          animation: "lightning-flash 4s ease-in-out infinite",
          animationDelay: "1.5s",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgba(200,180,255,0.6)",
          animation: "lightning-flash 6s ease-in-out infinite",
          animationDelay: "0.3s",
        }}
      />
    </>
  );
}

function Particles({ condition }: { condition: WeatherCondition }) {
  switch (condition) {
    case "rain":          return <ParticlesRain n={12} dur="1.25s" />;
    case "drizzle":       return <ParticlesRain n={8}  dur="1.9s"  />;
    case "thunderstorm":  return <ParticlesLightning />;
    case "storm_hail":    return <ParticlesHail />;
    case "snow":          return <ParticlesSnow />;
    case "sunny":         return <ParticlesSun />;
    case "very_hot":      return <ParticlesHeat extreme={false} />;
    case "extreme_heat":  return <ParticlesHeat extreme={true}  />;
    case "partly_cloudy": return <ParticlesClouds partly />;
    case "cloudy":        return <ParticlesClouds partly={false} />;
    case "fog":           return <ParticlesClouds partly={false} />;
    default:              return null;
  }
}

// ── Safety indicator ───────────────────────────────────────────────────────────

const SAFETY_CONFIG = {
  green:  { color: "#22c55e", label: "Condiciones seguras para trabajo exterior" },
  yellow: { color: "#eab308", label: "Precaución: condiciones moderadamente adversas" },
  red:    { color: "#ef4444", label: "Riesgo alto: evitar trabajo exterior" },
};

// ── Card ───────────────────────────────────────────────────────────────────────

export function WeatherCard({ day }: { day: DayForecast }) {
  const theme  = CONDITION_THEME[day.condition];
  const safety = SAFETY_CONFIG[day.safetyLevel];
  const tw     = theme.lightText;

  return (
    <div
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden select-none transition-transform duration-200 hover:scale-[1.03] ${
        day.isToday ? "ring-2 ring-white/50 shadow-2xl scale-[1.04]" : "shadow-lg"
      }`}
      style={{
        width: "108px",
        minHeight: "175px",
        background: `linear-gradient(155deg, ${theme.gradientFrom} 0%, ${theme.gradientTo} 100%)`,
      }}
      role="article"
      aria-label={`${day.isToday ? "Hoy" : day.dayLabel} ${day.dayNumber}: ${theme.label}, ${day.maxTemp}°/${day.minTemp}°`}
    >
      {/* ── Capa de partículas ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <Particles condition={day.condition} />
      </div>

      {/* ── Indicador de seguridad ── */}
      <div
        className="absolute top-2.5 right-2.5 z-30 rounded-full"
        style={{
          width: "10px",
          height: "10px",
          background: safety.color,
          boxShadow: `0 0 6px ${safety.color}`,
          animation: day.safetyLevel === "red" ? "safety-pulse 1.6s ease-in-out infinite" : undefined,
        }}
        title={safety.label}
        aria-label={safety.label}
      />

      {/* ── Contenido ── */}
      <div className="relative z-10 flex flex-col h-full p-3" style={{ minHeight: "175px" }}>

        {/* Día */}
        <div className="mb-1.5">
          <p
            className="text-[9px] font-black uppercase tracking-[0.15em] leading-none"
            style={{ color: tw ? "rgba(255,255,255,0.65)" : "rgba(30,41,59,0.65)" }}
          >
            {day.isToday ? "HOY" : day.dayLabel}
          </p>
          <p
            className="text-2xl font-black leading-tight"
            style={{ color: tw ? "#ffffff" : "#0f172a" }}
          >
            {day.dayNumber}
          </p>
          <p
            className="text-[9px] leading-none -mt-0.5"
            style={{ color: tw ? "rgba(255,255,255,0.55)" : "rgba(30,41,59,0.5)" }}
          >
            {day.monthLabel}
          </p>
        </div>

        {/* Ícono condición */}
        <div className="text-[2rem] leading-none my-1" aria-hidden="true">
          {theme.emoji}
        </div>

        {/* Temperaturas */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1">
            <span
              className="text-lg font-black leading-none"
              style={{ color: tw ? "#ffffff" : "#0f172a" }}
            >
              {day.maxTemp}°
            </span>
            <span
              className="text-xs leading-none"
              style={{ color: tw ? "rgba(255,255,255,0.55)" : "rgba(30,41,59,0.5)" }}
            >
              {day.minTemp}°
            </span>
          </div>

          {/* Label condición */}
          <p
            className="text-[9px] font-semibold mt-0.5 leading-tight"
            style={{ color: tw ? "rgba(255,255,255,0.8)" : "rgba(30,41,59,0.7)" }}
          >
            {theme.label}
          </p>

          {/* Viento + precipitación */}
          <div
            className="flex gap-2 mt-2 text-[8px] font-medium"
            style={{ color: tw ? "rgba(255,255,255,0.65)" : "rgba(30,41,59,0.55)" }}
          >
            <span title="Viento máx.">💨 {day.maxWind}</span>
            <span title="Prob. precipitación">🌧 {day.precipProbability}%</span>
          </div>
        </div>
      </div>

      {/* Overlay sutil de borde inferior para profundidad */}
      <div
        className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-2xl"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.2), transparent)",
        }}
      />
    </div>
  );
}

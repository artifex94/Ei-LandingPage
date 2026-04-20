"use client";

import type { WeatherCondition } from "@/lib/weather";

const COLS   = [6, 13, 20, 28, 36, 44, 52, 60, 67, 75, 82, 90];
const DELAYS = [0, 0.22, 0.44, 0.11, 0.66, 0.33, 0.55, 0.77, 0.18, 0.50, 0.27, 0.88];

function Rain({ n = 12, dur = "1.25s" }: { n?: number; dur?: string }) {
  return (
    <>
      {COLS.slice(0, n).map((left, i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: `${left}%`, top: "-8%", width: "1px",
          height: dur === "1.25s" ? "14px" : "9px",
          background: dur === "1.25s" ? "rgba(147,197,253,0.75)" : "rgba(186,230,253,0.55)",
          animation: `rain-fall ${dur} linear infinite`,
          animationDelay: `${DELAYS[i]}s`,
        }} />
      ))}
    </>
  );
}

function Hail() {
  return (
    <>
      {COLS.slice(0, 12).map((left, i) => (
        <span key={i} className="absolute rounded-sm" style={{
          left: `${left}%`, top: "-6%", width: "4px", height: "4px",
          background: "rgba(203,213,225,0.9)",
          animation: "hail-fall 0.65s linear infinite",
          animationDelay: `${DELAYS[i] * 0.8}s`,
        }} />
      ))}
      {COLS.slice(0, 8).map((left, i) => (
        <span key={`r${i}`} className="absolute rounded-full" style={{
          left: `${left + 3}%`, top: "-8%", width: "1px", height: "10px",
          background: "rgba(147,197,253,0.5)",
          animation: "rain-fall 1.1s linear infinite",
          animationDelay: `${DELAYS[i] + 0.3}s`,
        }} />
      ))}
    </>
  );
}

function Snow() {
  const sizes = [6, 5, 7, 5, 6, 8, 5, 6, 7, 5];
  return (
    <>
      {COLS.slice(0, 10).map((left, i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: `${left}%`, top: "-5%",
          width: `${sizes[i]}px`, height: `${sizes[i]}px`,
          background: "rgba(255,255,255,0.85)",
          animation: `snow-drift ${1.8 + (i % 3) * 0.6}s ease-in infinite`,
          animationDelay: `${DELAYS[i] * 1.2}s`,
        }} />
      ))}
    </>
  );
}

function Sun() {
  return (
    <>
      <div className="absolute pointer-events-none" style={{
        width: "200px", height: "200px", top: "50%", left: "50%",
        background: "conic-gradient(transparent 0deg,rgba(255,220,60,0.18) 20deg,transparent 40deg,rgba(255,220,60,0.18) 60deg,transparent 80deg,rgba(255,220,60,0.18) 100deg,transparent 120deg,rgba(255,220,60,0.18) 140deg,transparent 160deg,rgba(255,220,60,0.18) 180deg,transparent 200deg,rgba(255,220,60,0.18) 220deg,transparent 240deg,rgba(255,220,60,0.18) 260deg,transparent 280deg,rgba(255,220,60,0.18) 300deg,transparent 320deg,rgba(255,220,60,0.18) 340deg,transparent 360deg)",
        animation: "sun-ray-rotate 10s linear infinite", borderRadius: "50%",
      }} />
      <div className="absolute pointer-events-none rounded-full" style={{
        width: "70px", height: "70px", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle, rgba(255,220,80,0.25) 0%, transparent 70%)",
      }} />
    </>
  );
}

function Heat({ extreme }: { extreme: boolean }) {
  const color = extreme ? "rgba(239,68,68,0.4)" : "rgba(251,191,36,0.35)";
  const tops  = [18, 34, 51, 68, 82];
  return (
    <>
      {tops.map((top, i) => (
        <div key={i} className="absolute left-0 right-0" style={{
          height: "2px", top: `${top}%`,
          background: `linear-gradient(90deg,transparent 0%,${color} 25%,rgba(255,100,20,${extreme ? 0.55 : 0.45}) 50%,${color} 75%,transparent 100%)`,
          filter: "blur(1.5px)",
          animation: `heat-shimmer ${1.6 + i * 0.3}s ease-in-out infinite`,
          animationDelay: `${i * 0.35}s`,
        }} />
      ))}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        height: "40%",
        background: `linear-gradient(to top, ${extreme ? "rgba(127,29,29,0.3)" : "rgba(180,83,9,0.2)"}, transparent)`,
      }} />
    </>
  );
}

function Clouds({ partly }: { partly: boolean }) {
  const blobs = partly
    ? [{ w: 70, h: 22, top: 10, left: -8, delay: 0 }, { w: 50, h: 16, top: 28, left: 20, delay: 1.2 }]
    : [{ w: 85, h: 26, top: 5, left: -12, delay: 0 }, { w: 65, h: 20, top: 20, left: 10, delay: 0.8 }, { w: 55, h: 18, top: 38, left: -5, delay: 1.6 }];
  return (
    <>
      {blobs.map((b, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none" style={{
          width: `${b.w}px`, height: `${b.h}px`, top: `${b.top}%`, left: `${b.left}%`,
          background: partly ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.15)",
          filter: "blur(4px)",
          animation: `cloud-float ${3.5 + i * 0.8}s ease-in-out infinite`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}
    </>
  );
}

function Lightning() {
  return (
    <>
      <Rain n={10} dur="1.15s" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "rgba(200,180,255,0.6)",
        animation: "lightning-flash 4s ease-in-out infinite",
        animationDelay: "1.5s",
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "rgba(200,180,255,0.6)",
        animation: "lightning-flash 6s ease-in-out infinite",
        animationDelay: "0.3s",
      }} />
    </>
  );
}

export function WeatherParticles({ condition }: { condition: WeatherCondition }) {
  switch (condition) {
    case "rain":          return <Rain n={12} dur="1.25s" />;
    case "drizzle":       return <Rain n={8}  dur="1.9s"  />;
    case "thunderstorm":  return <Lightning />;
    case "storm_hail":    return <Hail />;
    case "snow":          return <Snow />;
    case "sunny":         return <Sun />;
    case "very_hot":      return <Heat extreme={false} />;
    case "extreme_heat":  return <Heat extreme={true}  />;
    case "partly_cloudy": return <Clouds partly />;
    case "cloudy":        return <Clouds partly={false} />;
    case "fog":           return <Clouds partly={false} />;
    default:              return null;
  }
}

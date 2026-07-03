// Fuente única de los indicadores de la landing (antes duplicados en
// HeroSection, FeaturesSection y ContactSection).

export const YEARS_EXPERIENCE = 26;

export type LandingStat =
  | { kind: "count"; to: number; prefix?: string; suffix?: string; label: string }
  | { kind: "text"; value: string; label: string };

export const landingStats: LandingStat[] = [
  { kind: "count", to: YEARS_EXPERIENCE, suffix: " años", label: "en el sector" },
  { kind: "count", to: 100, prefix: "+", label: "clientes y creciendo" },
  { kind: "text", value: "Respuesta", label: "inmediata ante el evento" },
];

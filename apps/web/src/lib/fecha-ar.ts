/**
 * Helpers de fecha/hora en horario de Argentina (UTC-3 fijo, sin horario de
 * verano desde 2009 → desfase determinístico, sin depender de Intl/ICU ni del
 * timezone del runtime).
 *
 * Regla del proyecto: en la base se guarda SIEMPRE el instante absoluto (UTC).
 * La conversión a hora de Argentina es solo de presentación.
 */

export const TZ_OFFSET_AR_MS = 3 * 60 * 60 * 1000;

/**
 * SoftGuard devuelve la hora LOCAL de Argentina SIN offset de zona
 * (ej. "2026-06-10T13:21:59.61"). `new Date()` la interpretaría como hora del
 * runtime (UTC en el server de producción) y la guardaría 3 h corrida hacia
 * atrás. Acá fijamos -03:00 para obtener el instante absoluto correcto.
 * Si el string ya trae zona (Z o ±hh:mm), se respeta tal cual.
 */
export function parseFechaSoftguard(raw: string): Date {
  const t = raw.trim().replace(" ", "T");
  const tieneZona = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(t);
  return new Date(tieneZona ? t : `${t}-03:00`);
}

/** Date "wall clock" de Argentina: leer con getUTC*. `null` si la fecha es inválida. */
function aHoraAR(fecha: string | Date): Date | null {
  const t = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(t.getTime())) return null;
  return new Date(t.getTime() - TZ_OFFSET_AR_MS);
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** "HH:mm:ss" en hora de Argentina. */
export function horaAR(fecha: string | Date): string {
  const ar = aHoraAR(fecha);
  if (!ar) return "";
  return `${p2(ar.getUTCHours())}:${p2(ar.getUTCMinutes())}:${p2(ar.getUTCSeconds())}`;
}

/** "HH:mm" en hora de Argentina. */
export function horaCortaAR(fecha: string | Date): string {
  const ar = aHoraAR(fecha);
  if (!ar) return "";
  return `${p2(ar.getUTCHours())}:${p2(ar.getUTCMinutes())}`;
}

/** Hora del día (0–23) en Argentina; `0` si la fecha es inválida (no rompe). */
export function horaNumeroAR(fecha: string | Date): number {
  const ar = aHoraAR(fecha);
  return ar ? ar.getUTCHours() : 0;
}

/** "DD/MM" en hora de Argentina. */
export function diaMesAR(fecha: string | Date): string {
  const ar = aHoraAR(fecha);
  if (!ar) return "";
  return `${p2(ar.getUTCDate())}/${p2(ar.getUTCMonth() + 1)}`;
}

/** "DD/MM/AAAA" en hora de Argentina. */
export function fechaAR(fecha: string | Date): string {
  const ar = aHoraAR(fecha);
  if (!ar) return "";
  return `${p2(ar.getUTCDate())}/${p2(ar.getUTCMonth() + 1)}/${ar.getUTCFullYear()}`;
}

/**
 * Saludo de cortesía según la hora local de Argentina al momento de notificar:
 *   06:00–11:59 → "Buenos días" · 12:00–19:59 → "Buenas tardes" · resto → "Buenas noches".
 * `fecha` es inyectable para tests deterministas; por defecto, el instante actual.
 */
export function saludoPorHora(fecha: Date = new Date()): string {
  const ar = aHoraAR(fecha);
  const h = ar ? ar.getUTCHours() : 0;
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Antigüedad legible para feeds/listas: "recién", "hace 5 min", "hace 2 h",
 * "ayer", "hace 3 días"; para fechas más viejas (>7 días) o futuras cae a la
 * fecha absoluta AR ("DD/MM/AAAA"). La diferencia temporal es independiente de
 * la zona; solo la fecha absoluta de fallback se muestra en hora de Argentina.
 */
export function fechaRelativaAR(fecha: number | string | Date): string {
  const t =
    fecha instanceof Date ? fecha.getTime()
    : typeof fecha === "number" ? fecha
    : new Date(fecha).getTime();
  if (Number.isNaN(t)) return "";

  const diffMs = Date.now() - t;
  if (diffMs < 0) return fechaAR(new Date(t)); // futuro → mostrar absoluta

  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;

  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;

  return fechaAR(new Date(t));
}

/** ¿La fecha cae hoy, en hora de Argentina? */
export function esHoyAR(fecha: string | Date): boolean {
  const ar = aHoraAR(fecha);
  const hoy = aHoraAR(new Date());
  if (!ar || !hoy) return false;
  return (
    ar.getUTCFullYear() === hoy.getUTCFullYear() &&
    ar.getUTCMonth() === hoy.getUTCMonth() &&
    ar.getUTCDate() === hoy.getUTCDate()
  );
}

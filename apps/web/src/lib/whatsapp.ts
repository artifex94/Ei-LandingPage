/**
 * Helpers de WhatsApp por enlace `wa.me` (lado cliente). NO usa la API de WhatsApp ni Twilio.
 *
 * Distinto de `@/lib/twilio` (envío server-side por la API de Twilio): acá todo es
 * construcción de strings PURA y testeable. El `window.open(...)` queda en el componente
 * que consume estos helpers, no acá.
 */

const PREFIJO_PAIS_AR = "549";

// Argentina es UTC-3 fijo (no observa horario de verano desde 2009) → desfase determinístico.
const TZ_OFFSET_AR_MS = 3 * 60 * 60 * 1000;

/**
 * Normaliza un teléfono argentino a 10 dígitos (área + número), sin prefijo país.
 * Consolida la lógica duplicada de `app/login/actions.ts` y `app/admin/higienizar/actions.ts`.
 * Devuelve `null` si no se puede normalizar.
 */
export function normalizarTelefono(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 13 && digits.startsWith("549")) return digits.slice(3);
  if (digits.length === 12 && digits.startsWith("54")) return digits.slice(2);
  return null;
}

/**
 * Construye el link `wa.me` hacia un teléfono argentino: `https://wa.me/549XXXXXXXXXX`,
 * con `?text=` URL-encodeado si se pasa mensaje. Devuelve `null` si el teléfono no normaliza.
 */
export function linkWhatsApp(telefono: string, mensaje?: string): string | null {
  const tel10 = normalizarTelefono(telefono);
  if (!tel10) return null;
  const url = `https://wa.me/${PREFIJO_PAIS_AR}${tel10}`;
  return mensaje ? `${url}?text=${encodeURIComponent(mensaje)}` : url;
}

/** Hora (HH:mm) y fecha (DD/MM/AAAA) en hora de Argentina, determinístico (sin Intl/ICU). */
function partesFechaHoraAR(fechaISO: string): { hora: string; fecha: string } | null {
  const t = new Date(fechaISO);
  if (Number.isNaN(t.getTime())) return null;
  const ar = new Date(t.getTime() - TZ_OFFSET_AR_MS);
  const hh = String(ar.getUTCHours()).padStart(2, "0");
  const mm = String(ar.getUTCMinutes()).padStart(2, "0");
  const dd = String(ar.getUTCDate()).padStart(2, "0");
  const mo = String(ar.getUTCMonth() + 1).padStart(2, "0");
  return { hora: `${hh}:${mm}`, fecha: `${dd}/${mo}/${ar.getUTCFullYear()}` };
}

/** Línea de un evento para la lista: "descripción - zona X" (zona solo si hay). */
function lineaEvento(descripcion: string, zona: string | null): string {
  const desc = descripcion?.trim() || "un evento";
  const z = zona?.trim() ? ` - zona ${zona.trim()}` : "";
  return `${desc}${z}`;
}

/** Criticidad de un evento según su prioridad SoftGuard (1 = crítica, 2 = media, resto = otra). */
export type CategoriaEvento = "critica" | "media" | "otra";

export function categoriaEvento(prioridad: number | null): CategoriaEvento {
  if (prioridad === 1) return "critica";
  if (prioridad === 2) return "media";
  return "otra";
}

/**
 * Texto por criticidad: título del encabezado (en negrita wa.me), verbo de la intro y cierre.
 * Centraliza el copy — es la base ajustable de todos los avisos de evento.
 *
 * Sin emojis a propósito: WhatsApp Desktop mangla los emojis del texto pre-cargado de wa.me
 * (los muestra como "?"). La jerarquía la da la negrita + mayúsculas del título, no un emoji.
 */
const CONFIG_CATEGORIA: Record<CategoriaEvento, { titulo: string; intro: string; cierre: string }> = {
  critica: { titulo: "ALARMA ACTIVADA", intro: "tu alarma reportó", cierre: "¿Está todo bien? Si necesitás ayuda, respondé este mensaje." },
  media: { titulo: "Aviso", intro: "tu sistema reportó", cierre: "Ya lo estamos revisando." },
  otra: { titulo: "Registro", intro: "tu alarma registró", cierre: "" },
};

/**
 * Mensaje wa.me para notificar uno o varios eventos de la MISMA cuenta (varias zonas en un solo
 * aviso), con el tono adaptado a la criticidad. Formato legible en emergencia: encabezado con
 * emoji + hora, y las zonas en lista vertical con viñetas (no entrecortadas en una sola línea).
 * El cliente ya sabe quién escribe y dónde responder (es el chat), por eso no hay empresa ni teléfono.
 *
 *   *ALARMA ACTIVADA* · 22:14
 *   Hola Juan, tu alarma reportó:
 *   · Robo - zona 2
 *   · Fuego - zona Cocina
 *
 *   ¿Está todo bien? Si necesitás ayuda, respondé este mensaje.
 */
export function mensajeEvento(input: {
  prioridad: number | null;
  nombreContacto: string;
  eventos: { descripcion: string; zona: string | null }[];
  fechaISO: string;
}): string {
  const cfg = CONFIG_CATEGORIA[categoriaEvento(input.prioridad)];
  const primerNombre = (input.nombreContacto ?? "").trim().split(/\s+/)[0] ?? "";
  const saludo = primerNombre ? `Hola ${primerNombre},` : "Hola,";
  const partes = partesFechaHoraAR(input.fechaISO);

  const encabezado = `*${cfg.titulo}*${partes ? ` · ${partes.hora}` : ""}`;
  const lineas = [...new Set(input.eventos.map((e) => lineaEvento(e.descripcion, e.zona)))];

  const cuerpo =
    lineas.length <= 1
      ? `${saludo} ${cfg.intro} ${lineas[0] ?? "un evento"}.`
      : `${saludo} ${cfg.intro}:\n${lineas.map((l) => `· ${l}`).join("\n")}`;

  const bloques = [`${encabezado}\n${cuerpo}`];
  if (cfg.cierre) bloques.push(cfg.cierre);
  return bloques.join("\n\n");
}

/** Mensaje de eventos P1 (varias zonas). Delega en `mensajeEvento` con prioridad crítica. */
export function mensajeEventosP1(input: {
  nombreContacto: string;
  eventos: { descripcion: string; zona: string | null }[];
  fechaISO: string;
}): string {
  return mensajeEvento({ prioridad: 1, ...input });
}

/** Conveniencia para un solo evento P1 (delega en la versión plural). */
export function mensajeEventoP1(input: {
  nombreContacto: string;
  descripcionEvento: string;
  softguardRef: string;
  zona: string | null;
  fechaISO: string;
}): string {
  return mensajeEventosP1({
    nombreContacto: input.nombreContacto,
    eventos: [{ descripcion: input.descripcionEvento, zona: input.zona }],
    fechaISO: input.fechaISO,
  });
}

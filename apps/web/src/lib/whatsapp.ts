/**
 * Helpers de WhatsApp por enlace `wa.me` (lado cliente). NO usa la API de WhatsApp ni Twilio.
 *
 * Distinto de `@/lib/twilio` (envío server-side por la API de Twilio): acá todo es
 * construcción de strings PURA y testeable. El `window.open(...)` queda en el componente
 * que consume estos helpers, no acá.
 */

import { saludoPorHora } from "./fecha-ar";

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

/**
 * SoftGuard manda las descripciones en MAYÚSCULAS ("ROBO ZONA 2"). Las bajamos a minúscula
 * para un tono menos alarmante en el mensaje al cliente, preservando tokens con dígitos
 * (p. ej. "220V"). La mayúscula inicial la decide quien arma la línea (viñeta sí, inline no).
 */
function normalizarDescripcion(descripcion: string): string {
  return (descripcion ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => (/\d/.test(w) ? w : w.toLowerCase()))
    .join(" ");
}

const capitalizar = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * ¿El evento es una restauración? SoftGuard manda en el código (rec_calarma) "RES" para
 * la restauración y "BUR" para el robo. Exigimos que "RES" no sea parte de otra palabra
 * para no pisar otros códigos. Centralizado acá: si la central usa otra marca, se ajusta acá.
 */
export function esRestauracion(codigo: string | null): boolean {
  return /(^|[^A-Z])RES/i.test((codigo ?? "").trim());
}

/** Normaliza el número de zona crudo: "002" → "2"; conserva no-numéricos ("Patio"). */
function normalizarNumeroZona(raw: string | null): string | null {
  const z = (raw ?? "").trim();
  if (!z) return null;
  return /^\d+$/.test(z) ? String(parseInt(z, 10)) : z;
}

/** Etiqueta legible de zona: "(3) patio" / "(2)" / "patio" / "" si no hay dato. */
function formatZona(zonaNumero: string | null, zonaLabel: string | null): string {
  const label = (zonaLabel ?? "").trim();
  const labelEsNumero = /^\d+$/.test(label);
  const num = normalizarNumeroZona(zonaNumero) ?? (labelEsNumero ? normalizarNumeroZona(label) : null);
  const nombre = label && !labelEsNumero ? normalizarDescripcion(label) : "";
  if (num && nombre) return `(${num}) ${nombre}`;
  if (num) return `(${num})`;
  if (nombre) return nombre;
  return "";
}

/** Clave estable para parear robo↔restauración por zona (número si hay; si no, nombre en minúscula). */
function claveZona(zonaNumero: string | null, zonaLabel: string | null): string {
  const num = normalizarNumeroZona(zonaNumero);
  if (num) return `n:${num}`;
  const label = (zonaLabel ?? "").trim().toLowerCase();
  return label ? `l:${label}` : "";
}

/** Fecha ISO más reciente entre los ítems (con la hora del evento por ítem); `fallback` si no hay válidas. */
function ultimaFechaISO(items: { fecha: string }[], fallback: string): string {
  let max = fallback;
  let maxT = -Infinity;
  for (const it of items) {
    const t = new Date(it.fecha).getTime();
    if (!Number.isNaN(t) && t >= maxT) {
      maxT = t;
      max = it.fecha;
    }
  }
  return max;
}

/** Línea de evento para la lista de alerta: "descripción - zona (n) nombre" (zona solo si hay). */
function lineaEvento(descripcion: string, etiquetaZona: string): string {
  const desc = normalizarDescripcion(descripcion) || "un evento";
  const z = etiquetaZona ? ` - zona ${etiquetaZona}` : "";
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
  critica: { titulo: "Alerta de seguridad", intro: "Tu alarma reportó", cierre: "¿Está todo bien? Si necesitás ayuda, respondé este mensaje." },
  media: { titulo: "Aviso", intro: "Tu sistema reportó", cierre: "Ya lo estamos revisando." },
  otra: { titulo: "Registro", intro: "Tu alarma registró", cierre: "" },
};

/** Copy del aviso ameno cuando la(s) alarma(s) ya se restauraron (robo seguido de su restauración). */
const CONFIG_RESTAURADA = { titulo: "Alarma restaurada", intro: "Tu alarma se restauró", cierre: "¿Todo bien?" };

/** Ítem de evento para construir el mensaje. `codigo`/`zonaNumero`/`fecha` son opcionales (defaults seguros). */
export interface EventoMensajeItem {
  descripcion: string;
  zona: string | null;
  codigo?: string | null;
  zonaNumero?: string | null;
  fecha?: string; // ISO del evento puntual (para comparar "RES después de BUR")
}

/**
 * Mensaje wa.me para notificar uno o varios eventos de la MISMA cuenta (varias zonas en un solo
 * aviso), con el tono adaptado a la criticidad. Formato legible en emergencia: título sobrio en
 * negrita + hora, saludo por horario, y las zonas en lista vertical con viñetas (no entrecortadas).
 * El cliente ya sabe quién escribe y dónde responder (es el chat), por eso no hay empresa ni teléfono.
 *
 *   *Alerta de seguridad* · 22:14
 *   Buenas noches, Juan. Tu alarma reportó:
 *   · Robo - zona 2
 *   · Fuego - zona Cocina
 *
 *   ¿Está todo bien? Si necesitás ayuda, respondé este mensaje.
 */
export function mensajeEvento(input: {
  prioridad: number | null;
  nombreContacto: string;
  eventos: EventoMensajeItem[];
  fechaISO: string;
}): string {
  const primerNombre = (input.nombreContacto ?? "").trim().split(/\s+/)[0] ?? "";
  const saludo = (fechaISO: string): string => {
    const f = new Date(fechaISO);
    const hola = saludoPorHora(Number.isNaN(f.getTime()) ? undefined : f);
    return primerNombre ? `${hola}, ${primerNombre}.` : `${hola}.`;
  };
  const headerHora = (fechaISO: string): string => {
    const p = partesFechaHoraAR(fechaISO);
    return p ? ` · ${p.hora}` : "";
  };

  // Cada ítem con su fecha (para "RES después de BUR"), su clave de zona y su etiqueta legible.
  const items = input.eventos.map((e) => ({
    descripcion: e.descripcion,
    fecha: e.fecha ?? input.fechaISO,
    esRest: esRestauracion(e.codigo ?? null),
    clave: claveZona(e.zonaNumero ?? null, e.zona),
    etiquetaZona: formatZona(e.zonaNumero ?? null, e.zona),
  }));

  const restauraciones = items.filter((e) => e.esRest);
  const alarmas = items.filter((e) => !e.esRest);

  // Una alarma queda restaurada si hay una RES en la MISMA zona con fecha posterior.
  const estaRestaurada = (a: (typeof items)[number]): boolean =>
    !!a.clave &&
    restauraciones.some(
      (r) => r.clave === a.clave && new Date(r.fecha).getTime() > new Date(a.fecha).getTime(),
    );

  const activas = alarmas.filter((a) => !estaRestaurada(a));
  const restauradas = alarmas.filter(estaRestaurada);

  // Tono ameno: si no quedan alarmas activas y hubo restauración, informamos "restaurada".
  if (activas.length === 0 && (restauradas.length > 0 || restauraciones.length > 0)) {
    const fuenteZonas = restauradas.length > 0 ? restauradas : restauraciones;
    const fechaH = ultimaFechaISO(restauraciones.length > 0 ? restauraciones : restauradas, input.fechaISO);
    const zonas = [...new Set(fuenteZonas.map((e) => e.etiquetaZona).filter(Boolean))];
    const encabezado = `*${CONFIG_RESTAURADA.titulo}*${headerHora(fechaH)}`;
    const cuerpo =
      zonas.length <= 1
        ? `${saludo(fechaH)} ${CONFIG_RESTAURADA.intro}${zonas[0] ? ` en la zona ${zonas[0]}` : ""}.`
        : `${saludo(fechaH)} ${CONFIG_RESTAURADA.intro} en las zonas:\n${zonas.map((z) => `· ${z}`).join("\n")}`;
    return [`${encabezado}\n${cuerpo}`, CONFIG_RESTAURADA.cierre].join("\n\n");
  }

  // Modo alerta: listamos SOLO las zonas activas (las ya restauradas se omiten para no diluir la urgencia).
  const cfg = CONFIG_CATEGORIA[categoriaEvento(input.prioridad)];
  const base = activas.length > 0 ? activas : items; // si no se reconoció ninguna, mostramos lo que haya
  const fechaH = ultimaFechaISO(base, input.fechaISO);
  const lineas = [...new Set(base.map((e) => lineaEvento(e.descripcion, e.etiquetaZona)))];
  const encabezado = `*${cfg.titulo}*${headerHora(fechaH)}`;
  const cuerpo =
    lineas.length <= 1
      ? `${saludo(fechaH)} ${cfg.intro} ${lineas[0] ?? "un evento"}.`
      : `${saludo(fechaH)} ${cfg.intro}:\n${lineas.map((l) => `· ${capitalizar(l)}`).join("\n")}`;

  const bloques = [`${encabezado}\n${cuerpo}`];
  if (cfg.cierre) bloques.push(cfg.cierre);
  return bloques.join("\n\n");
}

/** Mensaje de eventos P1 (varias zonas). Delega en `mensajeEvento` con prioridad crítica. */
export function mensajeEventosP1(input: {
  nombreContacto: string;
  eventos: EventoMensajeItem[];
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
  codigo?: string | null;
  zonaNumero?: string | null;
  fechaISO: string;
}): string {
  return mensajeEventosP1({
    nombreContacto: input.nombreContacto,
    eventos: [{ descripcion: input.descripcionEvento, zona: input.zona, codigo: input.codigo, zonaNumero: input.zonaNumero }],
    fechaISO: input.fechaISO,
  });
}

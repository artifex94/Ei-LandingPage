/**
 * Plantillas de mensaje pre-escritas para el hub de mensajería al cliente (wa.me).
 *
 * Copy sobrio en español rioplatense neutro (es-AR). Distinto de `whatsapp.ts`, que
 * tiene los helpers puros de link (`linkWhatsApp`) y la plantilla del evento P1.
 * El operador puede editar el texto en el preview antes de enviar.
 */

import { siteConfig } from "@/config/site";
import { saludoPorHora } from "./fecha-ar";

export type MotivoMensaje =
  | "EVENTO_P1"
  | "EVENTO_P2"
  | "EVENTO_OTRO"
  | "RECORDATORIO_PAGO"
  | "VENCIMIENTO_PROXIMO"
  | "CONFIRMACION_PAGO"
  | "MORA_SUSPENSION"
  | "CAMBIO_TARIFA"
  | "REACTIVACION_SERVICIO"
  | "BIENVENIDA"
  | "VISITA_TECNICA"
  | "PRUEBA_ALARMA"
  | "SIN_COMUNICACION"
  | "ACTUALIZAR_DATOS"
  | "AVISO_GENERAL"
  | "LIBRE";

/** Etiqueta legible del motivo — se usa como `asunto` en NotificacionCliente y en la UI. */
export const ETIQUETA_MOTIVO: Record<MotivoMensaje, string> = {
  EVENTO_P1: "Evento crítico",
  EVENTO_P2: "Evento de alarma",
  EVENTO_OTRO: "Aviso de evento",
  RECORDATORIO_PAGO: "Recordatorio de pago",
  VENCIMIENTO_PROXIMO: "Vencimiento próximo",
  CONFIRMACION_PAGO: "Confirmación de pago",
  MORA_SUSPENSION: "Aviso de mora",
  CAMBIO_TARIFA: "Cambio de tarifa",
  REACTIVACION_SERVICIO: "Servicio reactivado",
  BIENVENIDA: "Bienvenida",
  VISITA_TECNICA: "Visita técnica",
  PRUEBA_ALARMA: "Prueba de alarma",
  SIN_COMUNICACION: "Sin comunicación",
  ACTUALIZAR_DATOS: "Actualizar datos",
  AVISO_GENERAL: "Aviso general",
  LIBRE: "Mensaje",
};

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function primerNombre(nombre: string): string {
  return (nombre ?? "").trim().split(/\s+/)[0] ?? "";
}

/**
 * Apertura del mensaje con saludo según la hora de notificación (mañana/tarde/noche) + nombre:
 * "Buenos días, Juan." (o "Buenos días." si no hay nombre). `ahora` es inyectable para tests.
 */
function saludo(nombre: string, ahora?: Date): string {
  const s = saludoPorHora(ahora);
  const n = primerNombre(nombre);
  return n ? `${s}, ${n}.` : `${s}.`;
}

/** Monto en pesos con separador de miles es-AR: 30000 → "$30.000". */
function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

/** Período legible: (4, 2026) → "abril 2026". */
function periodo(mes: number, anio: number): string {
  return `${MESES_ES[mes - 1] ?? ""} ${anio}`.trim();
}

const LINK_PORTAL = `${siteConfig.url}/portal/pagos`;
const LINK_PORTAL_HOME = `${siteConfig.url}/portal`;

// Formato wa.me: `*texto*` = negrita. Título en negrita + cuerpo en bloques separados por
// línea en blanco. Sin emojis (WhatsApp Desktop los rompe en el texto pre-cargado).

/** Deuda de UNA cuenta, para el desglose de titulares con 2+ cuentas activas. */
export interface DeudaPorCuenta {
  etiqueta: string;
  monto: number;
  meses: { mes: number; anio: number }[];
}

/** Línea de desglose: "· *Casa* (Rawson 255): $30.000 (marzo 2026, abril 2026)". */
function lineaDesglose(d: DeudaPorCuenta): string {
  const meses = d.meses.map((m) => periodo(m.mes, m.anio)).join(", ");
  const detalle = meses ? ` (${meses})` : "";
  return `· ${d.etiqueta}: ${pesos(d.monto)}${detalle}`;
}

/** Recordatorio de deuda actual ("ponete al día"). */
export function mensajeRecordatorioPago(input: {
  nombreContacto: string;
  deudaTotal: number;
  mesesAdeudados: { mes: number; anio: number }[];
  /** Desglose opcional por cuenta (titulares con 2+ cuentas activas). Con 2+ ítems, el mensaje detalla cada cuenta; si no, sale igual que siempre (retrocompatible). */
  desglose?: DeudaPorCuenta[];
  ahora?: Date;
}): string {
  const saludoLinea = saludo(input.nombreContacto, input.ahora);
  if (input.desglose && input.desglose.length > 1) {
    const lineas = input.desglose.map(lineaDesglose).join("\n");
    return (
      `*Recordatorio de pago*\n\n` +
      `${saludoLinea} Tenés pagos pendientes por *${pesos(input.deudaTotal)}*:\n${lineas}\n\n` +
      `Ponete al día desde tu portal:\n${LINK_PORTAL}`
    );
  }
  const meses = input.mesesAdeudados.map((m) => periodo(m.mes, m.anio)).join(", ");
  const detalle = meses ? ` (${meses})` : "";
  return (
    `*Recordatorio de pago*\n\n` +
    `${saludoLinea} Tenés pagos pendientes por *${pesos(input.deudaTotal)}*${detalle}.\n\n` +
    `Ponete al día desde tu portal:\n${LINK_PORTAL}`
  );
}

/** Aviso preventivo del período corriente, antes del vencimiento. */
export function mensajeVencimientoProximo(input: {
  nombreContacto: string;
  importe: number;
  mes: number;
  anio: number;
  diaVto?: number;
  ahora?: Date;
}): string {
  const dia = input.diaVto ?? siteConfig.fiscal.diaVtoPago;
  return (
    `*Vencimiento próximo*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} El pago de *${periodo(input.mes, input.anio)}* ` +
    `(${pesos(input.importe)}) vence el día *${dia}*.\n\n` +
    `Lo podés abonar desde tu portal:\n${LINK_PORTAL}`
  );
}

/** Acuse de recibo / agradecimiento cuando se acredita un pago. */
export function mensajeConfirmacionPago(input: {
  nombreContacto: string;
  mes: number;
  anio: number;
  importe: number;
  ahora?: Date;
}): string {
  return (
    `*Pago recibido*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Recibimos tu pago de *${periodo(input.mes, input.anio)}* ` +
    `(${pesos(input.importe)}). ¡Gracias! Tu cuenta está al día.`
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Cobranza — escalación y novedades de cuenta
// ──────────────────────────────────────────────────────────────────────────────

/** Escalación de mora: deuda acumulada con aviso de posible suspensión del servicio. */
export function mensajeMoraSuspension(input: {
  nombreContacto: string;
  deudaTotal: number;
  mesesAdeudados: { mes: number; anio: number }[];
  /** Desglose opcional por cuenta (titulares con 2+ cuentas activas). Con 2+ ítems, el mensaje detalla cada cuenta; si no, sale igual que siempre (retrocompatible). */
  desglose?: DeudaPorCuenta[];
  ahora?: Date;
}): string {
  const saludoLinea = saludo(input.nombreContacto, input.ahora);
  if (input.desglose && input.desglose.length > 1) {
    const lineas = input.desglose.map(lineaDesglose).join("\n");
    return (
      `*Aviso de pago pendiente*\n\n` +
      `${saludoLinea} Registramos una deuda de *${pesos(input.deudaTotal)}*:\n${lineas}\n` +
      `Para no interrumpir el servicio de monitoreo, te pedimos regularizarla a la brevedad.\n\n` +
      `Podés abonar desde tu portal:\n${LINK_PORTAL}`
    );
  }
  const meses = input.mesesAdeudados.map((m) => periodo(m.mes, m.anio)).join(", ");
  const detalle = meses ? ` (${meses})` : "";
  return (
    `*Aviso de pago pendiente*\n\n` +
    `${saludoLinea} Registramos una deuda de *${pesos(input.deudaTotal)}*${detalle}.\n` +
    `Para no interrumpir el servicio de monitoreo, te pedimos regularizarla a la brevedad.\n\n` +
    `Podés abonar desde tu portal:\n${LINK_PORTAL}`
  );
}

/** Aviso de ajuste de la cuota mensual. El operador completa mes y monto en el preview. */
export function mensajeCambioTarifa(input: { nombreContacto: string; ahora?: Date }): string {
  return (
    `*Actualización de cuota*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Te informamos que a partir de *[mes]* la cuota mensual ` +
    `pasa a *[monto]*.\n\n` +
    `Agradecemos tu confianza. Ante cualquier consulta, quedamos a disposición.`
  );
}

/** Confirmación de que el servicio volvió a estar activo tras regularizar la deuda. */
export function mensajeReactivacionServicio(input: { nombreContacto: string; ahora?: Date }): string {
  return (
    `*Servicio reactivado*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Tu cuenta quedó al día y el monitoreo está activo nuevamente.\n` +
    `¡Gracias por regularizarlo! Cualquier duda, quedamos a disposición.`
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Operación, servicio técnico y relación con el cliente
// ──────────────────────────────────────────────────────────────────────────────

/** Mensaje de alta para un titular recién incorporado. */
export function mensajeBienvenida(input: { nombreContacto: string; ahora?: Date }): string {
  return (
    `*Bienvenido a ${siteConfig.name}*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Tu servicio de monitoreo ya está activo.\n` +
    `Guardá este número para cualquier aviso. Vas a poder ver tus eventos y pagos desde tu portal:\n` +
    `${LINK_PORTAL_HOME}`
  );
}

/** Coordinación de una visita técnica. El operador completa día y horario en el preview. */
export function mensajeVisitaTecnica(input: { nombreContacto: string; ahora?: Date }): string {
  return (
    `*Visita técnica*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Coordinamos una visita técnica para *[día y horario]*.\n` +
    `¿Te queda cómodo? Si preferís otro momento, avisanos y lo reprogramamos.`
  );
}

/** Aviso de una prueba periódica del sistema de alarma. */
export function mensajePruebaAlarma(input: { nombreContacto: string; ahora?: Date }): string {
  return (
    `*Prueba de alarma*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Vamos a hacer una prueba del sistema para verificar que ` +
    `comunica bien con la central.\n` +
    `Si en los próximos minutos suena la sirena, es parte de la prueba. Te avisamos al terminar.`
  );
}

/** Aviso proactivo de que el equipo dejó de reportar. El operador completa la fecha/hora. */
export function mensajeSinComunicacion(input: { nombreContacto: string; ahora?: Date }): string {
  return (
    `*Tu alarma dejó de comunicar*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Notamos que tu equipo dejó de reportar a la central ` +
    `desde *[fecha/hora]*.\n` +
    `¿Podés revisar que tenga corriente y conexión? Si necesitás ayuda, respondé este mensaje.`
  );
}

/** Pedido de verificación/actualización de datos de contacto. */
export function mensajeActualizarDatos(input: { nombreContacto: string; ahora?: Date }): string {
  return (
    `*Actualización de datos*\n\n` +
    `${saludo(input.nombreContacto, input.ahora)} Estamos poniendo al día los datos de contacto.\n` +
    `¿Seguís usando este número y la misma dirección? Si algo cambió, contanos y lo corregimos.`
  );
}

/** Comunicado libre con saludo por hora ya armado. El operador escribe el cuerpo en `[mensaje]`. */
export function mensajeAvisoGeneral(input: { nombreContacto: string; ahora?: Date }): string {
  return `*Aviso*\n\n${saludo(input.nombreContacto, input.ahora)} [mensaje]`;
}

/**
 * Plantillas de mensaje pre-escritas para el hub de mensajería al cliente (wa.me).
 *
 * Copy sobrio en español rioplatense neutro (es-AR). Distinto de `whatsapp.ts`, que
 * tiene los helpers puros de link (`linkWhatsApp`) y la plantilla del evento P1.
 * El operador puede editar el texto en el preview antes de enviar.
 */

import { siteConfig } from "@/config/site";

export type MotivoMensaje =
  | "EVENTO_P1"
  | "EVENTO_P2"
  | "EVENTO_OTRO"
  | "RECORDATORIO_PAGO"
  | "VENCIMIENTO_PROXIMO"
  | "CONFIRMACION_PAGO"
  | "LIBRE";

/** Etiqueta legible del motivo — se usa como `asunto` en NotificacionCliente y en la UI. */
export const ETIQUETA_MOTIVO: Record<MotivoMensaje, string> = {
  EVENTO_P1: "Evento crítico",
  EVENTO_P2: "Evento de alarma",
  EVENTO_OTRO: "Aviso de evento",
  RECORDATORIO_PAGO: "Recordatorio de pago",
  VENCIMIENTO_PROXIMO: "Vencimiento próximo",
  CONFIRMACION_PAGO: "Confirmación de pago",
  LIBRE: "Mensaje",
};

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function primerNombre(nombre: string): string {
  return (nombre ?? "").trim().split(/\s+/)[0] ?? "";
}

function saludo(nombre: string): string {
  const n = primerNombre(nombre);
  return n ? `Hola ${n}.` : "Hola.";
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

/** Recordatorio de deuda actual ("ponete al día"). */
export function mensajeRecordatorioPago(input: {
  nombreContacto: string;
  deudaTotal: number;
  mesesAdeudados: { mes: number; anio: number }[];
}): string {
  const meses = input.mesesAdeudados.map((m) => periodo(m.mes, m.anio)).join(", ");
  const detalle = meses ? ` (${meses})` : "";
  return (
    `${saludo(input.nombreContacto)} Tenés pagos pendientes por ${pesos(input.deudaTotal)}${detalle}. ` +
    `Ponete al día desde tu portal: ${LINK_PORTAL}`
  );
}

/** Aviso preventivo del período corriente, antes del vencimiento. */
export function mensajeVencimientoProximo(input: {
  nombreContacto: string;
  importe: number;
  mes: number;
  anio: number;
  diaVto?: number;
}): string {
  const dia = input.diaVto ?? siteConfig.fiscal.diaVtoPago;
  return (
    `${saludo(input.nombreContacto)} El pago de ${periodo(input.mes, input.anio)} ` +
    `(${pesos(input.importe)}) vence el día ${dia}. Lo podés abonar desde tu portal: ${LINK_PORTAL}`
  );
}

/** Acuse de recibo / agradecimiento cuando se acredita un pago. */
export function mensajeConfirmacionPago(input: {
  nombreContacto: string;
  mes: number;
  anio: number;
  importe: number;
}): string {
  return (
    `${saludo(input.nombreContacto)} Recibimos tu pago de ${periodo(input.mes, input.anio)} ` +
    `(${pesos(input.importe)}). ¡Gracias! Tu cuenta está al día.`
  );
}

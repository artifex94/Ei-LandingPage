/**
 * Agregador del feed de notificaciones del cliente para "Mi Central".
 *
 * Unifica tres fuentes en un solo tipo serializable (`NotificacionItem`) que el
 * layout (Server Component) construye y pasa por props a la campana (Client):
 *   1. Estado financiero en vivo (mora / pago en revisión) → items "pinned".
 *   2. Eventos de alarma SoftGuard relevantes (intrusión / fuego / pánico / médica).
 *   3. Mensajes que el sistema le envió al cliente (NotificacionCliente, ENVIADA).
 *
 * Las fechas viajan como epoch ms (UTC) — `Date` no cruza el boundary
 * Server→Client de forma limpia. La presentación a hora AR se hace en el cliente.
 */

import { prisma } from "@/lib/prisma/client";
import { clasificarCodigo, type TipoDia } from "@/lib/eventos-clasificacion";
import type { EstadoFinanciero } from "@/lib/billing-state";

export type SeveridadFeed = "critico" | "alerta" | "info" | "exito";
export type TipoFeed = "evento" | "notificacion" | "estado-financiero";

export interface NotificacionItem {
  /** Id estable y prefijado por fuente: `evt:`, `not:`, `fin:`. */
  id: string;
  /** Instante absoluto en epoch ms (UTC). */
  fecha: number;
  tipo: TipoFeed;
  severidad: SeveridadFeed;
  titulo: string;
  detalle?: string;
  href?: string;
  /** Estado financiero en vivo: se fija arriba y no cuenta como "nuevo". */
  pinned?: boolean;
}

/** Eventos relevantes para el cliente. `normal`/`tecnico` → excluidos (ruido). */
const SEVERIDAD_EVENTO: Partial<Record<TipoDia, SeveridadFeed>> = {
  medica: "critico",
  violencia: "critico",
  fuego: "critico",
  intrusion: "alerta",
};

const MAX_POR_FUENTE = 40;
const MAX_FEED = 50;

export async function construirFeedNotificaciones(params: {
  userId: string;
  /** Ya calculado por el layout — no se recalcula el estado de cuentas acá. */
  peorEstado: EstadoFinanciero;
}): Promise<NotificacionItem[]> {
  const { userId, peorEstado } = params;

  const [eventos, notifs] = await Promise.all([
    prisma.eventoAlarma.findMany({
      where: { cuenta: { perfil_id: userId, estado: { not: "BAJA_DEFINITIVA" } } },
      include: { cuenta: { select: { descripcion: true } } },
      orderBy: { fecha_evento: "desc" },
      take: MAX_POR_FUENTE,
    }),
    prisma.notificacionCliente.findMany({
      where: { perfil_id: userId, estado: "ENVIADA" },
      orderBy: { fecha_envio: "desc" },
      take: MAX_POR_FUENTE,
    }),
  ]);

  const items: NotificacionItem[] = [];

  // ── 1. Estado financiero en vivo (pinned arriba) ─────────────────────────────
  // SUSPENDED no genera item: ya dispara el modal bloqueante PagoRequeridoGuard.
  if (peorEstado.tipo === "GRACE_PERIOD") {
    const d = peorEstado.dias_mora;
    items.push({
      id: "fin:grace",
      fecha: Date.now(),
      tipo: "estado-financiero",
      severidad: "alerta",
      titulo: `Tenés un pago vencido hace ${d} día${d !== 1 ? "s" : ""}`,
      detalle: "Tu servicio puede suspenderse. Regularizá para evitar cortes.",
      href: "/portal/pagos",
      pinned: true,
    });
  } else if (peorEstado.tipo === "PAYMENT_IN_REVIEW") {
    items.push({
      id: "fin:review",
      fecha: Date.now(),
      tipo: "estado-financiero",
      severidad: "info",
      titulo: "Tu pago está siendo verificado",
      detalle: "En breve se actualizará el estado de tu servicio.",
      href: "/portal/pagos",
      pinned: true,
    });
  }

  // ── 2. Eventos de alarma relevantes ──────────────────────────────────────────
  for (const ev of eventos) {
    const severidad = SEVERIDAD_EVENTO[clasificarCodigo(ev.codigo)];
    if (!severidad) continue; // excluye normal/técnico
    const detalle = [ev.cuenta?.descripcion, ev.zona].filter(Boolean).join(" · ");
    items.push({
      id: `evt:${ev.id}`,
      fecha: ev.fecha_evento.getTime(),
      tipo: "evento",
      severidad,
      titulo: ev.descripcion,
      detalle: detalle || undefined,
      href: "/portal/eventos",
    });
  }

  // ── 3. Mensajes del sistema (NotificacionCliente) ────────────────────────────
  for (const n of notifs) {
    const esCobranza = n.origen === "COBRANZA";
    items.push({
      id: `not:${n.id}`,
      fecha: n.fecha_envio.getTime(),
      tipo: "notificacion",
      severidad: esCobranza ? "alerta" : "info",
      titulo: n.asunto ?? "Notificación",
      detalle: n.cuerpo_resumen || undefined,
      href: esCobranza ? "/portal/pagos" : undefined,
    });
  }

  // ── Orden: pinned arriba, resto por fecha desc ───────────────────────────────
  items.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.fecha - a.fecha;
  });

  return items.slice(0, MAX_FEED);
}

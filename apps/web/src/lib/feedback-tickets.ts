// Orden de la bandeja /admin/feedback como función pura (testeable sin DB):
// primero los tickets abiertos (NUEVO/EN_REVISION), luego por prioridad
// descendente (CRITICA→BAJA) y por fecha de creación descendente.

// Tipos derivados del schema Prisma (solo tipos: el módulo sigue sin
// dependencias de runtime, testeable sin DB).
import type { EstadoTicketFeedback, PrioridadTicket } from "@/generated/prisma/client";

export type { EstadoTicketFeedback, PrioridadTicket };

export interface TicketOrdenable {
  estado: EstadoTicketFeedback;
  prioridad: PrioridadTicket;
  creado_en: Date | string;
}

const ABIERTOS = new Set<EstadoTicketFeedback>(["NUEVO", "EN_REVISION"]);

const ORDEN_PRIORIDAD: Record<PrioridadTicket, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
};

function tiempo(fecha: Date | string): number {
  return new Date(fecha).getTime();
}

/**
 * Ordena tickets: abiertos antes que cerrados, luego por prioridad
 * (CRITICA primero) y por fecha de creación descendente (más nuevo primero).
 * No muta el array de entrada.
 */
export function ordenarTickets<T extends TicketOrdenable>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    const aAbierto = ABIERTOS.has(a.estado) ? 0 : 1;
    const bAbierto = ABIERTOS.has(b.estado) ? 0 : 1;
    if (aAbierto !== bAbierto) return aAbierto - bAbierto;

    const prioridadDiff = ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad];
    if (prioridadDiff !== 0) return prioridadDiff;

    return tiempo(b.creado_en) - tiempo(a.creado_en);
  });
}

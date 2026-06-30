"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { requireCapacidad } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/constants/validation";
import type { EstadoEventoSync } from "@/generated/prisma/client";
import { clasificarCodigo, PRIORIDAD, type TipoDia } from "@/lib/eventos-clasificacion";

// ── Tipos ──────────────────────────────────────────────────────────────────────

// NOTA: este archivo es "use server", así que NO se puede re-exportar `TipoDia`
// con `export type { TipoDia }` — el proxy de server actions de Turbopack lo
// trataría como una action de runtime y el build falla. Los consumidores del
// tipo lo importan directo de `@/lib/eventos-clasificacion`.

export interface DiaEvento {
  fecha: string;   // YYYY-MM-DD
  total: number;
  tipo: TipoDia;
}

// ── Query principal ────────────────────────────────────────────────────────────

export async function getEventosHeatmap(
  cuentaId: string,
  anio: number,
): Promise<DiaEvento[]> {
  if (!UUID_RE.test(cuentaId)) return [];
  const desde = new Date(anio, 0, 1);
  const hasta = new Date(anio, 11, 31, 23, 59, 59);

  const rows = await prisma.eventoAlarma.findMany({
    where: {
      cuenta_id: cuentaId,
      fecha_evento: { gte: desde, lte: hasta },
    },
    select: { fecha_evento: true, codigo: true },
    orderBy: { fecha_evento: "asc" },
  });

  const byDia = new Map<string, { total: number; tipo: TipoDia }>();

  for (const ev of rows) {
    const fecha = ev.fecha_evento.toISOString().slice(0, 10);
    const tipoEv = clasificarCodigo(ev.codigo);
    const existing = byDia.get(fecha);

    if (!existing) {
      byDia.set(fecha, { total: 1, tipo: tipoEv });
    } else {
      existing.total += 1;
      if (PRIORIDAD[tipoEv] > PRIORIDAD[existing.tipo]) {
        existing.tipo = tipoEv;
      }
    }
  }

  return Array.from(byDia.entries())
    .map(([fecha, { total, tipo }]) => ({ fecha, total, tipo }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ── Mutación: actualizar estado de evento ──────────────────────────────────────

const ESTADOS_VALIDOS = new Set<string>([
  "NUEVO", "EN_PROCESO", "EN_ESPERA", "EN_PROCESO_DESDE_ESPERA",
  "EN_PROCESO_MULTIPLE", "PROCESADO", "PROCESADO_NO_ALERTA",
  "PROCESADO_MODO_PRUEBA", "PROCESADO_MODO_OFF",
]);

export async function actualizarEstadoEvento(
  id: string,
  nuevoEstado: string,
  resolucion?: string,
): Promise<{ error?: string }> {
  if (!UUID_RE.test(id)) {
    return { error: "ID de evento inválido." };
  }

  const admin = await requireCapacidad("puede_monitorear");

  if (!ESTADOS_VALIDOS.has(nuevoEstado)) {
    return { error: "Estado no válido." };
  }

  if (resolucion && resolucion.length > 2000) {
    return { error: "La resolución no puede superar los 2000 caracteres." };
  }

  const evento = await prisma.eventoAlarma.findUnique({
    where: { id },
    select: { estado: true },
  });

  if (!evento) return { error: "Evento no encontrado." };

  await prisma.eventoAlarma.update({
    where: { id },
    data: {
      estado: nuevoEstado as EstadoEventoSync,
      ...(resolucion !== undefined ? { resolucion } : {}),
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "EVENTO_ESTADO_ACTUALIZADO",
    entidad: "evento_alarma",
    entidad_id: id,
    detalle: { resolucion },
    state_transition: {
      prior_state: evento.estado,
      new_state: nuevoEstado,
    },
  });

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);

  return {};
}

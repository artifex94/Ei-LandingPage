"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { requireAdminWithName as requireAdmin } from "@/lib/actions/auth";
import { UUID_RE } from "@/lib/constants/validation";
import type { EstadoEventoSync } from "@/generated/prisma/client";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type TipoDia =
  | "medica"
  | "violencia"
  | "fuego"
  | "intrusion"
  | "tecnico"
  | "normal"
  | "vacio";

export interface DiaEvento {
  fecha: string;   // YYYY-MM-DD
  total: number;
  tipo: TipoDia;
}

// ── Prioridad de severidad (mayor número = más crítico) ────────────────────────

const PRIORIDAD: Record<TipoDia, number> = {
  vacio:     0,
  normal:    1,
  tecnico:   2,
  intrusion: 3,
  fuego:     4,
  violencia: 5,
  medica:    6,
};

// ── Clasificación Contact ID ───────────────────────────────────────────────────
// Protocolo Contact ID / SIA usado por SoftGuard (campo EventoAlarma.codigo)
//   E100-E101 → Emergencia médica / personal
//   E110-E119 → Incendio / Humo / Combustión
//   E120-E122 → Pánico / Coacción / Hold-up
//   E130-E159 → Intrusión / Zona / Perímetro
//   E300-E399 → Problemas técnicos (tamper, AC, batería)
//   E4xx-E6xx → Operaciones normales (apertura, cierre, test, periódico)

function clasificarCodigo(codigo: string): TipoDia {
  const c = codigo.trim().toUpperCase();

  if (/^[ER]10[01]/.test(c))       return "medica";
  if (/^[ER]12[012]/.test(c))      return "violencia";
  if (/^[ER]11[0-9]/.test(c))      return "fuego";
  if (/^[ER]1[3-5][0-9]/.test(c))  return "intrusion";
  if (/^[ER]3[0-9]{2}/.test(c))    return "tecnico";

  // Apertura, cierre, test, heartbeat, restauraciones → actividad normal
  return "normal";
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

  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos." };

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

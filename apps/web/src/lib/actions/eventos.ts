"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { requireCapacidad } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/constants/validation";
import type {
  EstadoEventoSync,
  TipoGestionEvento,
  ResultadoGestion,
} from "@/generated/prisma/client";
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

// Estados que cierran el evento (fin de la gestión) → pisan `resuelto_en`.
const ESTADOS_RESUELTOS = new Set<string>([
  "PROCESADO", "PROCESADO_NO_ALERTA", "PROCESADO_MODO_PRUEBA", "PROCESADO_MODO_OFF",
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
    select: { estado: true, tomado_en: true, resuelto_en: true },
  });

  if (!evento) return { error: "Evento no encontrado." };

  const ahora = new Date();
  const seEstaTomando = nuevoEstado !== "NUEVO" && evento.tomado_en === null;
  const seEstaResolviendo = ESTADOS_RESUELTOS.has(nuevoEstado) && evento.resuelto_en === null;

  await prisma.eventoAlarma.update({
    where: { id },
    data: {
      estado: nuevoEstado as EstadoEventoSync,
      ...(resolucion !== undefined ? { resolucion } : {}),
      ...(seEstaTomando ? { tomado_en: ahora, tomado_por: admin.nombre } : {}),
      ...(seEstaResolviendo ? { resuelto_en: ahora } : {}),
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

// ── Protocolo guiado de actuación (Fase 7b) ──────────────────────────────────────

const TIPOS_GESTION_VALIDOS = new Set<string>([
  "LLAMADA_CONTACTO", "WHATSAPP_CONTACTO", "VERIFICACION_CAMARA", "AVISO_POLICIA", "OTRO",
]);

const RESULTADOS_GESTION_VALIDOS = new Set<string>([
  "ATENDIO", "NO_ATENDIO", "OCUPADO", "HECHO", "SIN_RESPUESTA",
]);

export interface RegistrarGestionEventoInput {
  evento_id: string;
  tipo: string;
  destino?: string;
  resultado: string;
  nota?: string;
}

/**
 * Registra UN paso del protocolo guiado (ver `protocoloParaClasificacion` en
 * `lib/eventos-clasificacion.ts`): una llamada a un contacto, un aviso a
 * policía, una verificación de cámara, etc. `orden` se calcula solo (cantidad
 * de pasos ya registrados + 1). NO toca el estado del evento — complementa
 * `resolucion` (texto libre), no la reemplaza.
 */
export async function registrarGestionEvento(
  input: RegistrarGestionEventoInput,
): Promise<{ error?: string }> {
  if (!UUID_RE.test(input.evento_id)) {
    return { error: "ID de evento inválido." };
  }

  const admin = await requireCapacidad("puede_monitorear");

  if (!TIPOS_GESTION_VALIDOS.has(input.tipo)) {
    return { error: "Tipo de gestión no válido." };
  }
  if (!RESULTADOS_GESTION_VALIDOS.has(input.resultado)) {
    return { error: "Resultado no válido." };
  }
  if (input.destino && input.destino.length > 200) {
    return { error: "El destino no puede superar los 200 caracteres." };
  }
  if (input.nota && input.nota.length > 2000) {
    return { error: "La nota no puede superar los 2000 caracteres." };
  }

  const evento = await prisma.eventoAlarma.findUnique({
    where: { id: input.evento_id },
    select: { id: true },
  });
  if (!evento) return { error: "Evento no encontrado." };

  // count + create bajo Serializable: dos taps concurrentes en el mismo
  // evento no deben terminar con el mismo `orden`. No hay constraint único
  // en (evento_id, orden), así que Read Committed no alcanza (el count sobre
  // filas que todavía no existen no bloquea nada) — Serializable hace que
  // Postgres aborte una de las dos transacciones en conflicto; esa acción
  // simplemente falla y el operador puede reintentar el tap.
  await prisma.$transaction(
    async (tx) => {
      const pasosPrevios = await tx.gestionEvento.count({
        where: { evento_id: input.evento_id },
      });

      await tx.gestionEvento.create({
        data: {
          evento_id: input.evento_id,
          orden: pasosPrevios + 1,
          tipo: input.tipo as TipoGestionEvento,
          destino: input.destino || null,
          resultado: input.resultado as ResultadoGestion,
          nota: input.nota || null,
          operador: admin.nombre,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );

  revalidatePath(`/admin/eventos/${input.evento_id}`);

  return {};
}

export interface GestionEventoItem {
  id: string;
  orden: number;
  tipo: string;
  destino: string | null;
  resultado: string;
  nota: string | null;
  operador: string;
  created_at: string; // ISO
}

/**
 * Historial de pasos ya registrados para un evento, más antiguo primero.
 * `catch` → `[]`: hasta que se corra el SQL manual de la Fase 7b
 * (`gestiones_evento`) la tabla no existe en la DB y la query fallaría.
 */
export async function getGestionesEvento(eventoId: string): Promise<GestionEventoItem[]> {
  if (!UUID_RE.test(eventoId)) return [];
  await requireCapacidad("puede_monitorear");

  try {
    const rows = await prisma.gestionEvento.findMany({
      where: { evento_id: eventoId },
      orderBy: { orden: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      orden: r.orden,
      tipo: r.tipo,
      destino: r.destino,
      resultado: r.resultado,
      nota: r.nota,
      operador: r.operador,
      created_at: r.created_at.toISOString(),
    }));
  } catch {
    return [];
  }
}

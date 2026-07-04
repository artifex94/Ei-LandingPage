"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { UUID_RE } from "@/lib/constants/validation";
import type { FranjaTurno, EstadoTurno } from "@/generated/prisma/client";
import { planificarSemana, generarFechasUTC } from "@/lib/scheduling/auto-asignar";
import { puedeSolicitarCambio, validarMotivoCambio } from "@/lib/turnos-cambio";
import { enviarWhatsApp } from "@/lib/twilio";

export async function asignarTurno(data: {
  empleado_id: string;
  fecha: Date;
  franja: FranjaTurno;
  notas?: string;
}) {
  const admin = await requireAdmin();

  const turno = await prisma.turno.upsert({
    where: {
      empleado_id_fecha_franja: {
        empleado_id: data.empleado_id,
        fecha: data.fecha,
        franja: data.franja,
      },
    },
    create: data,
    update: { notas: data.notas },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "TURNO_ASIGNAR",
    entidad: "turno",
    entidad_id: turno.id,
    detalle: { empleado_id: data.empleado_id, fecha: data.fecha, franja: data.franja },
  });

  revalidatePath("/admin/turnos");
  return turno;
}

/**
 * Auto-asigna los turnos de una semana repartiendo de forma lógica y equitativa
 * entre los monitores activos. Solo cubre huecos: respeta turnos ya asignados.
 *
 * @param semanaDesdeIso fecha de inicio (lunes) en formato "YYYY-MM-DD"
 */
export async function autoAsignarSemana(semanaDesdeIso: string) {
  const admin = await requireAdmin();

  const m = semanaDesdeIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error("Fecha de semana inválida.");
  const desde = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const fechas = generarFechasUTC(desde, 7);
  const hasta = fechas[6];

  const [monitores, turnosExistentes, ausencias] = await Promise.all([
    prisma.empleado.findMany({
      where: { activo: true, puede_monitorear: true },
      include: { perfil: { select: { nombre: true } } },
      orderBy: { created_at: "asc" },
    }),
    prisma.turno.findMany({
      where: {
        fecha: { gte: desde, lte: hasta },
        estado: { in: ["PROGRAMADO", "EN_CURSO", "COMPLETADO"] },
      },
      select: { empleado_id: true, fecha: true, franja: true },
    }),
    prisma.ausencia.findMany({
      where: { desde: { lte: hasta }, hasta: { gte: desde } },
      select: { empleado_id: true, desde: true, hasta: true },
    }),
  ]);

  if (monitores.length === 0) {
    return { creados: 0, mensaje: "No hay monitores activos habilitados." };
  }

  const propuestas = planificarSemana({
    monitores: monitores.map((e) => ({ id: e.id, nombre: e.perfil.nombre })),
    ausencias,
    turnosExistentes: turnosExistentes.map((t) => ({
      empleado_id: t.empleado_id,
      fecha: t.fecha,
      franja: t.franja,
    })),
    fechas,
  });

  if (propuestas.length === 0) {
    return { creados: 0, mensaje: "La semana ya está cubierta." };
  }

  const { count } = await prisma.turno.createMany({
    data: propuestas.map((p) => ({
      empleado_id: p.empleado_id,
      fecha: p.fecha,
      franja: p.franja,
      estado: "PROGRAMADO" as const,
    })),
    skipDuplicates: true,
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "TURNO_AUTOASIGNAR",
    entidad: "turno",
    entidad_id: semanaDesdeIso,
    detalle: { semana: semanaDesdeIso, creados: count, monitores: monitores.length },
  });

  revalidatePath("/admin/turnos");
  return { creados: count };
}

export async function cambiarEstadoTurno(turno_id: string, estado: EstadoTurno) {
  if (!UUID_RE.test(turno_id)) throw new Error("ID de turno inválido.");
  const admin = await requireAdmin();

  const ahora = new Date();
  const turno = await prisma.turno.update({
    where: { id: turno_id },
    data: {
      estado,
      ...(estado === "EN_CURSO" ? { checkin_at: ahora } : {}),
      ...(estado === "COMPLETADO" ? { checkout_at: ahora } : {}),
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "TURNO_ESTADO",
    entidad: "turno",
    entidad_id: turno_id,
    detalle: { estado },
    state_transition: { prior_state: null, new_state: estado },
  });

  revalidatePath("/admin/turnos");
  return turno;
}

export async function eliminarTurno(turno_id: string) {
  if (!UUID_RE.test(turno_id)) throw new Error("ID de turno inválido.");
  const admin = await requireAdmin();

  await prisma.turno.delete({ where: { id: turno_id } });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "TURNO_ELIMINAR",
    entidad: "turno",
    entidad_id: turno_id,
    detalle: {},
  });

  revalidatePath("/admin/turnos");
}

export async function getTurnosSemana(desde: Date, hasta: Date) {
  return prisma.turno.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    include: {
      empleado: {
        select: {
          id: true,
          color_calendario: true,
          perfil: { select: { nombre: true } },
        },
      },
    },
    orderBy: [{ fecha: "asc" }, { franja: "asc" }],
  });
}

// Usado desde /portal/turno-actual — el propio empleado hace check-in/out
async function getEmpleadoActual() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.empleado.findUnique({
    where: { perfil_id: user.id },
    include: { perfil: { select: { nombre: true } } },
  });
}

export async function checkinTurno(turnoId: string) {
  if (!UUID_RE.test(turnoId)) return { error: "ID de turno inválido." };
  const empleado = await getEmpleadoActual();
  if (!empleado) return { error: "No autorizado." };

  const turno = await prisma.turno.findUnique({ where: { id: turnoId }, select: { empleado_id: true, estado: true } });
  if (!turno || turno.empleado_id !== empleado.id) return { error: "Turno no encontrado." };
  if (turno.estado !== "PROGRAMADO") return { error: "El turno no está en estado PROGRAMADO." };

  await prisma.turno.update({
    where: { id: turnoId },
    data: { estado: "EN_CURSO", checkin_at: new Date() },
  });

  await registrarAudit({
    admin_id: empleado.perfil_id,
    admin_nombre: empleado.perfil.nombre,
    accion: "TURNO_CHECKIN",
    entidad: "turno",
    entidad_id: turnoId,
    state_transition: { prior_state: "PROGRAMADO", new_state: "EN_CURSO" },
  });

  revalidatePath("/portal/turno-actual");
}

export async function checkoutTurno(turnoId: string) {
  if (!UUID_RE.test(turnoId)) return { error: "ID de turno inválido." };
  const empleado = await getEmpleadoActual();
  if (!empleado) return { error: "No autorizado." };

  const turno = await prisma.turno.findUnique({ where: { id: turnoId }, select: { empleado_id: true, estado: true } });
  if (!turno || turno.empleado_id !== empleado.id) return { error: "Turno no encontrado." };
  if (turno.estado !== "EN_CURSO") return { error: "El turno no está en curso." };

  await prisma.turno.update({
    where: { id: turnoId },
    data: { estado: "COMPLETADO", checkout_at: new Date() },
  });

  await registrarAudit({
    admin_id: empleado.perfil_id,
    admin_nombre: empleado.perfil.nombre,
    accion: "TURNO_CHECKOUT",
    entidad: "turno",
    entidad_id: turnoId,
    state_transition: { prior_state: "EN_CURSO", new_state: "COMPLETADO" },
  });

  revalidatePath("/portal/turno-actual");
}

export async function verificarCobertura(fecha: Date): Promise<{
  MANANA: boolean;
  TARDE: boolean;
  NOCHE: boolean;
}> {
  const turnos = await prisma.turno.findMany({
    where: {
      fecha,
      estado: { in: ["PROGRAMADO", "EN_CURSO"] },
    },
    select: { franja: true },
  });

  const franjas = new Set(turnos.map((t) => t.franja));
  return {
    MANANA: franjas.has("MANANA"),
    TARDE: franjas.has("TARDE"),
    NOCHE: franjas.has("NOCHE"),
  };
}

// ── Solicitudes de cambio de turno (self-service del empleado) ───────────────
//
// Flujo: el empleado pide el cambio desde /portal/mis-turnos (motivo +
// compañero propuesto opcional) → el admin la resuelve desde /admin/turnos.
// Al aprobar, el turno original pasa a REEMPLAZADO; si hay reemplazo se crea
// su turno (con `reemplaza_a` apuntando al original), y si no, el hueco queda
// visible para el auto-asignador del cron (REEMPLAZADO no cuenta como
// cobertura en `verificarCobertura`).

export async function solicitarCambioTurno(input: {
  turnoId: string;
  motivo: string;
  reemplazoId?: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!UUID_RE.test(input.turnoId)) return { error: "ID de turno inválido." };
  if (input.reemplazoId && !UUID_RE.test(input.reemplazoId)) {
    return { error: "Reemplazo propuesto inválido." };
  }

  const motivoCheck = validarMotivoCambio(input.motivo);
  if (!motivoCheck.ok) return { error: motivoCheck.motivo };

  const empleado = await getEmpleadoActual();
  if (!empleado) return { error: "No autorizado." };

  const turno = await prisma.turno.findUnique({
    where: { id: input.turnoId },
    select: { empleado_id: true, estado: true, fecha: true, franja: true },
  });
  if (!turno || turno.empleado_id !== empleado.id) return { error: "Turno no encontrado." };

  const elegible = puedeSolicitarCambio(turno);
  if (!elegible.ok) return { error: elegible.motivo };

  const yaPendiente = await prisma.solicitudCambioTurno.findFirst({
    where: { turno_id: input.turnoId, estado: "PENDIENTE" },
    select: { id: true },
  });
  if (yaPendiente) return { error: "Ya hay una solicitud pendiente para este turno." };

  if (input.reemplazoId) {
    if (input.reemplazoId === empleado.id) {
      return { error: "El reemplazo propuesto no podés ser vos." };
    }
    const reemplazo = await prisma.empleado.findFirst({
      where: { id: input.reemplazoId, activo: true },
      select: { id: true },
    });
    if (!reemplazo) return { error: "El reemplazo propuesto no está disponible." };
  }

  const solicitud = await prisma.solicitudCambioTurno.create({
    data: {
      solicitante_id: empleado.id,
      turno_id: input.turnoId,
      motivo: input.motivo.trim(),
      reemplazo_id: input.reemplazoId ?? null,
    },
  });

  await registrarAudit({
    admin_id: empleado.perfil_id,
    admin_nombre: empleado.perfil.nombre,
    accion: "CAMBIO_TURNO_SOLICITAR",
    entidad: "solicitud_cambio_turno",
    entidad_id: solicitud.id,
    detalle: { turno_id: input.turnoId, reemplazo_id: input.reemplazoId ?? null },
  });

  // Aviso al admin, best-effort: si Twilio falla la solicitud queda igual.
  const ramiroTel = process.env.RAMIRO_TELEFONO;
  if (ramiroTel) {
    const fechaLabel = turno.fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
    await enviarWhatsApp(
      ramiroTel,
      `📅 *${empleado.perfil.nombre}* pidió cambiar su turno del ${fechaLabel} (${turno.franja}).\nMotivo: ${input.motivo.trim()}\nResolvé en /admin/turnos`,
    ).catch(() => false);
  }

  revalidatePath("/portal/mis-turnos");
  revalidatePath("/admin/turnos");
  return { ok: true };
}

export async function cancelarSolicitudCambioTurno(
  solicitudId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!UUID_RE.test(solicitudId)) return { error: "ID de solicitud inválido." };

  const empleado = await getEmpleadoActual();
  if (!empleado) return { error: "No autorizado." };

  const solicitud = await prisma.solicitudCambioTurno.findUnique({
    where: { id: solicitudId },
    select: { solicitante_id: true, estado: true },
  });
  if (!solicitud || solicitud.solicitante_id !== empleado.id) {
    return { error: "Solicitud no encontrada." };
  }
  if (solicitud.estado !== "PENDIENTE") {
    return { error: "La solicitud ya fue resuelta." };
  }

  await prisma.solicitudCambioTurno.update({
    where: { id: solicitudId },
    data: { estado: "CANCELADA", resuelto_en: new Date() },
  });

  await registrarAudit({
    admin_id: empleado.perfil_id,
    admin_nombre: empleado.perfil.nombre,
    accion: "CAMBIO_TURNO_CANCELAR",
    entidad: "solicitud_cambio_turno",
    entidad_id: solicitudId,
    state_transition: { prior_state: "PENDIENTE", new_state: "CANCELADA" },
  });

  revalidatePath("/portal/mis-turnos");
  revalidatePath("/admin/turnos");
  return { ok: true };
}

export async function resolverSolicitudCambioTurno(input: {
  solicitudId: string;
  decision: "APROBADA" | "RECHAZADA";
  /** Quién cubre el turno; si se omite al aprobar, el hueco lo toma el auto-asignador. */
  reemplazoId?: string;
  notasAdmin?: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!UUID_RE.test(input.solicitudId)) return { error: "ID de solicitud inválido." };
  if (input.reemplazoId && !UUID_RE.test(input.reemplazoId)) {
    return { error: "Reemplazo inválido." };
  }

  const admin = await requireAdmin();

  const solicitud = await prisma.solicitudCambioTurno.findUnique({
    where: { id: input.solicitudId },
    include: {
      turno: { select: { id: true, empleado_id: true, fecha: true, franja: true, estado: true } },
      solicitante: { select: { id: true, perfil: { select: { nombre: true, telefono: true } } } },
    },
  });
  if (!solicitud) return { error: "Solicitud no encontrada." };
  if (solicitud.estado !== "PENDIENTE") return { error: "La solicitud ya fue resuelta." };

  const ahora = new Date();

  if (input.decision === "RECHAZADA") {
    await prisma.solicitudCambioTurno.update({
      where: { id: input.solicitudId },
      data: {
        estado: "RECHAZADA",
        resuelto_por: admin.id,
        resuelto_en: ahora,
        notas_admin: input.notasAdmin?.trim() || null,
      },
    });
  } else {
    // El turno pudo haber cambiado de estado entre la solicitud y la resolución
    // (check-in, ausencia); solo un PROGRAMADO se puede reemplazar.
    if (solicitud.turno.estado !== "PROGRAMADO") {
      return { error: `El turno ya no está programado (${solicitud.turno.estado}).` };
    }

    const reemplazoId = input.reemplazoId ?? solicitud.reemplazo_id ?? null;
    if (reemplazoId === solicitud.turno.empleado_id) {
      return { error: "El reemplazo no puede ser el mismo empleado del turno." };
    }
    if (reemplazoId) {
      const reemplazo = await prisma.empleado.findFirst({
        where: { id: reemplazoId, activo: true },
        select: { id: true },
      });
      if (!reemplazo) return { error: "El reemplazo elegido no está disponible." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.solicitudCambioTurno.update({
        where: { id: input.solicitudId },
        data: {
          estado: "APROBADA",
          resuelto_por: admin.id,
          resuelto_en: ahora,
          notas_admin: input.notasAdmin?.trim() || null,
          ...(input.reemplazoId ? { reemplazo_id: input.reemplazoId } : {}),
        },
      });
      await tx.turno.update({
        where: { id: solicitud.turno.id },
        data: { estado: "REEMPLAZADO" },
      });
      if (reemplazoId) {
        await tx.turno.upsert({
          where: {
            empleado_id_fecha_franja: {
              empleado_id: reemplazoId,
              fecha: solicitud.turno.fecha,
              franja: solicitud.turno.franja,
            },
          },
          create: {
            empleado_id: reemplazoId,
            fecha: solicitud.turno.fecha,
            franja: solicitud.turno.franja,
            reemplaza_a: solicitud.turno.id,
            notas: `Cubre cambio aprobado de ${solicitud.solicitante.perfil.nombre}`,
          },
          update: { reemplaza_a: solicitud.turno.id },
        });
      }
    });
  }

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "CAMBIO_TURNO_RESOLVER",
    entidad: "solicitud_cambio_turno",
    entidad_id: input.solicitudId,
    detalle: { decision: input.decision, reemplazo_id: input.reemplazoId ?? solicitud.reemplazo_id ?? null },
    state_transition: { prior_state: "PENDIENTE", new_state: input.decision },
  });

  // Aviso al solicitante, best-effort.
  const telSolicitante = solicitud.solicitante.perfil.telefono;
  if (telSolicitante) {
    const fechaLabel = solicitud.turno.fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
    const cuerpo =
      input.decision === "APROBADA"
        ? `✅ Tu cambio de turno del ${fechaLabel} (${solicitud.turno.franja}) fue aprobado. Quedás libre esa franja.`
        : `Tu solicitud de cambio del ${fechaLabel} (${solicitud.turno.franja}) no fue aprobada.${input.notasAdmin ? ` Nota: ${input.notasAdmin.trim()}` : ""} Cualquier duda hablalo con Ramiro.`;
    await enviarWhatsApp(telSolicitante, cuerpo).catch(() => false);
  }

  revalidatePath("/admin/turnos");
  revalidatePath("/portal/mis-turnos");
  return { ok: true };
}

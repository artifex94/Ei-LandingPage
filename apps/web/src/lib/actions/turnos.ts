"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { UUID_RE } from "@/lib/constants/validation";
import type { FranjaTurno, EstadoTurno } from "@/generated/prisma/client";
import { planificarSemana, generarFechasUTC } from "@/lib/scheduling/auto-asignar";

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

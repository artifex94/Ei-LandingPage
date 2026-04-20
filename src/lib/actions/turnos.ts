"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { FranjaTurno, EstadoTurno } from "@/generated/prisma/client";

async function getAdminActual() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  return perfil?.rol === "ADMIN" ? perfil : null;
}

export async function asignarTurno(data: {
  empleado_id: string;
  fecha: Date;
  franja: FranjaTurno;
  notas?: string;
}) {
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

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

export async function cambiarEstadoTurno(turno_id: string, estado: EstadoTurno) {
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

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
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

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
    include: { empleado: { include: { perfil: true } } },
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

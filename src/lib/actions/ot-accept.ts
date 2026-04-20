"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function getEmpleado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const emp = await prisma.empleado.findFirst({
    where: { perfil_id: user.id },
    select: { id: true, perfil_id: true },
  });
  return emp ? { ...emp, userId: user.id } : null;
}

export async function aceptarOT(otId: string): Promise<{ ok: boolean; error?: string }> {
  const empleado = await getEmpleado();
  if (!empleado) return { ok: false, error: "Sin registro de empleado." };

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id: otId },
    include: { cuenta: { select: { calle: true, localidad: true } } },
  });

  if (!ot) return { ok: false, error: "OT no encontrada." };
  if (ot.estado !== "SOLICITADA") return { ok: false, error: "Esta OT ya fue tomada." };

  // Determinar fecha de la tarea: usar fecha_visita si existe, si no hoy
  const fechaTarea = ot.fecha_visita ? new Date(ot.fecha_visita) : new Date();
  fechaTarea.setHours(0, 0, 0, 0);

  // Extraer hora_inicio de fecha_visita si es un DateTime con hora
  let horaInicio: string | null = null;
  if (ot.fecha_visita) {
    const h = new Date(ot.fecha_visita);
    const hh = h.getHours().toString().padStart(2, "0");
    const mm = h.getMinutes().toString().padStart(2, "0");
    // Solo guardar si la hora no es 00:00 (que indica que era solo fecha)
    if (hh !== "00" || mm !== "00") horaInicio = `${hh}:${mm}`;
  }

  const titulo = [
    ot.tipo === "INSTALACION" ? "Instalación" :
    ot.tipo === "CORRECTIVO"  ? "Correctivo"  :
    ot.tipo === "PREVENTIVO"  ? "Preventivo"  : "Retiro",
    ot.cuenta?.calle ?? "",
  ].filter(Boolean).join(" — ") || ot.descripcion.slice(0, 60);

  await prisma.$transaction([
    prisma.ordenTrabajo.update({
      where: { id: otId },
      data: { estado: "ASIGNADA", tecnico_id: empleado.id },
    }),
    prisma.tareaAgendada.create({
      data: {
        titulo,
        descripcion: ot.descripcion,
        fecha:       fechaTarea,
        hora_inicio: horaInicio,
        prioridad:   ot.prioridad,
        tecnico_id:  empleado.userId,
        cuenta_id:   ot.cuenta_id ?? undefined,
        ot_id:       otId,
      },
    }),
  ]);

  revalidatePath("/tecnico/ots");
  revalidatePath("/tecnico/mi-dia");
  revalidatePath("/tecnico/mi-semana");
  revalidatePath("/tecnico/dashboard");
  return { ok: true };
}

export async function liberarOT(otId: string): Promise<{ ok: boolean; error?: string }> {
  const empleado = await getEmpleado();
  if (!empleado) return { ok: false, error: "Sin registro de empleado." };

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id: otId },
    select: { estado: true, tecnico_id: true, tarea: { select: { id: true } } },
  });

  if (!ot) return { ok: false, error: "OT no encontrada." };
  if (ot.tecnico_id !== empleado.id) return { ok: false, error: "No es tu OT." };
  if (ot.estado !== "ASIGNADA") return { ok: false, error: "Solo se puede liberar una OT en estado ASIGNADA." };

  await prisma.$transaction([
    // Eliminar la tarea vinculada si existe
    ...(ot.tarea ? [prisma.tareaAgendada.delete({ where: { id: ot.tarea.id } })] : []),
    prisma.ordenTrabajo.update({
      where: { id: otId },
      data: { estado: "SOLICITADA", tecnico_id: null },
    }),
  ]);

  revalidatePath("/tecnico/ots");
  revalidatePath("/tecnico/mi-dia");
  revalidatePath("/tecnico/mi-semana");
  revalidatePath("/tecnico/dashboard");
  return { ok: true };
}

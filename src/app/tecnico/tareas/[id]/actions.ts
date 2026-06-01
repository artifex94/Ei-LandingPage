"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";

async function requireTecnicoOwner(tareaId: string) {
  const { userId } = await requireSesion();

  const tarea = await prisma.tareaAgendada.findUnique({ where: { id: tareaId } });
  if (!tarea || tarea.tecnico_id !== userId) return null;
  return { userId, tarea };
}

export async function marcarCompletada(tareaId: string) {
  const ctx = await requireTecnicoOwner(tareaId);
  if (!ctx) return { error: "Sin permisos." };

  await prisma.tareaAgendada.update({
    where: { id: tareaId },
    data: { estado: "COMPLETADA" },
  });

  revalidatePath(`/tecnico/tareas/${tareaId}`);
  revalidatePath("/tecnico/dashboard");
  redirect("/tecnico/dashboard");
}

export async function guardarNotas(tareaId: string, notas: string) {
  const ctx = await requireTecnicoOwner(tareaId);
  if (!ctx) return { error: "Sin permisos." };

  await prisma.tareaAgendada.update({
    where: { id: tareaId },
    data: { notas_tecnico: notas },
  });

  revalidatePath(`/tecnico/tareas/${tareaId}`);
  return { ok: true };
}

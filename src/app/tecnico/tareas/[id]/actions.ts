"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function requireTecnicoOwner(tareaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tarea = await prisma.tareaAgendada.findUnique({ where: { id: tareaId } });
  if (!tarea || tarea.tecnico_id !== user.id) return null;
  return { user, tarea };
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

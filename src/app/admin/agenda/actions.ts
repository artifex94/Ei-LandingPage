"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") return null;
  return perfil;
}

export interface AgendaActionResult {
  ok?: boolean;
  errores?: string[];
}

const crearTareaSchema = z.object({
  titulo: z.string().min(2, "El título es obligatorio"),
  descripcion: z.string().optional().transform((v) => v || undefined),
  tecnico_id: z.string().min(1, "Seleccioná un técnico"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  hora_inicio: z.string().optional().transform((v) => v || undefined),
  hora_fin: z.string().optional().transform((v) => v || undefined),
  cuenta_id: z.string().optional().transform((v) => v || undefined),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]).default("MEDIA"),
});

export async function crearTarea(
  prevState: AgendaActionResult,
  formData: FormData
): Promise<AgendaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = crearTareaSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    tecnico_id: formData.get("tecnico_id"),
    fecha: formData.get("fecha"),
    hora_inicio: formData.get("hora_inicio"),
    hora_fin: formData.get("hora_fin"),
    cuenta_id: formData.get("cuenta_id"),
    prioridad: formData.get("prioridad"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { titulo, descripcion, tecnico_id, fecha, hora_inicio, hora_fin, cuenta_id, prioridad } = parsed.data;

  const tarea = await prisma.tareaAgendada.create({
    data: {
      titulo,
      descripcion,
      tecnico_id,
      fecha: new Date(fecha),
      hora_inicio,
      hora_fin,
      ...(cuenta_id && { cuenta_id }),
      prioridad,
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "TAREA_CREADA",
    entidad: "tarea_agendada",
    entidad_id: tarea.id,
    detalle: { titulo, tecnico_id, fecha },
  });

  redirect("/admin/agenda");
}

const editarTareaSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(2, "El título es obligatorio"),
  descripcion: z.string().optional().transform((v) => v || undefined),
  tecnico_id: z.string().min(1, "Seleccioná un técnico"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora_inicio: z.string().optional().transform((v) => v || undefined),
  hora_fin: z.string().optional().transform((v) => v || undefined),
  cuenta_id: z.string().optional().transform((v) => v || undefined),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]).default("MEDIA"),
  estado: z.enum(["PENDIENTE", "EN_CURSO", "COMPLETADA", "CANCELADA"]),
});

export async function editarTarea(
  prevState: AgendaActionResult,
  formData: FormData
): Promise<AgendaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = editarTareaSchema.safeParse({
    id: formData.get("id"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    tecnico_id: formData.get("tecnico_id"),
    fecha: formData.get("fecha"),
    hora_inicio: formData.get("hora_inicio"),
    hora_fin: formData.get("hora_fin"),
    cuenta_id: formData.get("cuenta_id"),
    prioridad: formData.get("prioridad"),
    estado: formData.get("estado"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { id, titulo, descripcion, tecnico_id, fecha, hora_inicio, hora_fin, cuenta_id, prioridad, estado } = parsed.data;

  const antes = await prisma.tareaAgendada.findUnique({ where: { id }, select: { estado: true } });

  await prisma.tareaAgendada.update({
    where: { id },
    data: {
      titulo,
      descripcion,
      tecnico_id,
      fecha: new Date(fecha),
      hora_inicio,
      hora_fin,
      cuenta_id: cuenta_id ?? null,
      prioridad,
      estado,
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "TAREA_EDITADA",
    entidad: "tarea_agendada",
    entidad_id: id,
    state_transition: antes ? { prior_state: antes.estado, new_state: estado } : undefined,
  });

  revalidatePath(`/admin/agenda/${id}`);
  revalidatePath("/admin/agenda");
  return { ok: true };
}

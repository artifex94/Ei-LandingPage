"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id }, select: { rol: true, nombre: true } });
  if (perfil?.rol !== "ADMIN") return null;
  return { id: user.id, nombre: perfil.nombre };
}

const crearSchema = z.object({
  empleado_id: z.string().uuid(),
  tipo: z.enum(["VACACIONES", "ENFERMEDAD", "PERSONAL", "FERIADO"]),
  desde: z.string().date(),
  hasta: z.string().date(),
  notas: z.string().optional(),
});

export async function crearAusencia(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos." };

  const parsed = crearSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    tipo:        formData.get("tipo"),
    desde:       formData.get("desde"),
    hasta:       formData.get("hasta"),
    notas:       formData.get("notas") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { empleado_id, tipo, desde, hasta, notas } = parsed.data;

  if (new Date(hasta) < new Date(desde)) {
    return { error: "La fecha 'hasta' debe ser posterior a 'desde'." };
  }

  const ausencia = await prisma.ausencia.create({
    data: { empleado_id, tipo, desde: new Date(desde), hasta: new Date(hasta), notas },
  });

  await registrarAudit({
    admin_id: admin.id, admin_nombre: admin.nombre,
    accion: "CREAR_AUSENCIA", entidad: "ausencia", entidad_id: ausencia.id,
    detalle: { tipo, desde, hasta },
  });

  revalidatePath("/admin/ausencias");
  revalidatePath("/admin/turnos");
}

export async function aprobarAusencia(ausenciaId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos." };

  await prisma.ausencia.update({ where: { id: ausenciaId }, data: { aprobada: true } });

  await registrarAudit({
    admin_id: admin.id, admin_nombre: admin.nombre,
    accion: "APROBAR_AUSENCIA", entidad: "ausencia", entidad_id: ausenciaId,
  });

  revalidatePath("/admin/ausencias");
  revalidatePath("/admin/turnos");
}

export async function eliminarAusencia(ausenciaId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos." };

  await prisma.ausencia.delete({ where: { id: ausenciaId } });

  await registrarAudit({
    admin_id: admin.id, admin_nombre: admin.nombre,
    accion: "ELIMINAR_AUSENCIA", entidad: "ausencia", entidad_id: ausenciaId,
  });

  revalidatePath("/admin/ausencias");
  revalidatePath("/admin/turnos");
}

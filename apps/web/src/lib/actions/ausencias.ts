"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { requireAdminWithName as requireAdmin } from "@/lib/actions/auth";
import { UUID_RE } from "@/lib/constants/validation";

const crearSchema = z.object({
  empleado_id: z.string().uuid(),
  tipo: z.enum(["VACACIONES", "ENFERMEDAD", "PERSONAL", "FERIADO"]),
  desde: z.string().date(),
  hasta: z.string().date(),
  notas: z.string().max(500).optional(),
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

  if (!UUID_RE.test(ausenciaId)) return { error: "ID inválido." };

  await prisma.ausencia.update({ where: { id: ausenciaId }, data: { aprobada: true } });

  await registrarAudit({
    admin_id: admin.id, admin_nombre: admin.nombre,
    accion: "APROBAR_AUSENCIA", entidad: "ausencia", entidad_id: ausenciaId,
  });

  revalidatePath("/admin/ausencias");
  revalidatePath("/admin/turnos");
}

const editarSchema = z.object({
  id: z.string().uuid(),
  tipo: z.enum(["VACACIONES", "ENFERMEDAD", "PERSONAL", "FERIADO"]),
  desde: z.string().date(),
  hasta: z.string().date(),
  notas: z.string().max(500).optional(),
});

export async function editarAusencia(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos." };

  const parsed = editarSchema.safeParse({
    id:    formData.get("id"),
    tipo:  formData.get("tipo"),
    desde: formData.get("desde"),
    hasta: formData.get("hasta"),
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, tipo, desde, hasta, notas } = parsed.data;

  if (new Date(hasta) < new Date(desde)) {
    return { error: "La fecha 'hasta' debe ser posterior a 'desde'." };
  }

  await prisma.ausencia.update({
    where: { id },
    data: { tipo, desde: new Date(desde), hasta: new Date(hasta), notas: notas ?? null },
  });

  await registrarAudit({
    admin_id: admin.id, admin_nombre: admin.nombre,
    accion: "EDITAR_AUSENCIA", entidad: "ausencia", entidad_id: id,
    detalle: { tipo, desde, hasta },
  });

  revalidatePath("/admin/ausencias");
  revalidatePath("/admin/turnos");
}

export async function eliminarAusencia(ausenciaId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos." };

  if (!UUID_RE.test(ausenciaId)) return { error: "ID inválido." };

  await prisma.ausencia.delete({ where: { id: ausenciaId } });

  await registrarAudit({
    admin_id: admin.id, admin_nombre: admin.nombre,
    accion: "ELIMINAR_AUSENCIA", entidad: "ausencia", entidad_id: ausenciaId,
  });

  revalidatePath("/admin/ausencias");
  revalidatePath("/admin/turnos");
}

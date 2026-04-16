"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function verificarAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id }, select: { rol: true } });
  if (perfil?.rol !== "ADMIN") redirect("/portal/dashboard");
  return user;
}

export async function iniciarSolicitud(id: string): Promise<void> {
  await verificarAdmin();
  await prisma.solicitudMantenimiento.update({
    where: { id },
    data: { estado: "EN_PROCESO" },
  });
  revalidatePath("/admin/mantenimiento");
}

export async function resolverSolicitud(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  await verificarAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "ID inválido." };

  await prisma.solicitudMantenimiento.update({
    where: { id },
    data: { estado: "RESUELTA", resuelta_en: new Date() },
  });

  revalidatePath("/admin/mantenimiento");
  return null;
}

export async function reabrirSolicitud(id: string): Promise<void> {
  await verificarAdmin();
  await prisma.solicitudMantenimiento.update({
    where: { id },
    data: { estado: "PENDIENTE", resuelta_en: null },
  });
  revalidatePath("/admin/mantenimiento");
}

export interface CrearSolicitudResult {
  ok?: boolean;
  errores?: string[];
}

export async function crearSolicitudMantenimiento(
  prevState: CrearSolicitudResult,
  formData: FormData
): Promise<CrearSolicitudResult> {
  await verificarAdmin();

  const cuenta_id = (formData.get("cuenta_id") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const prioridad = (formData.get("prioridad") as string) ?? "MEDIA";

  if (!cuenta_id || !descripcion) {
    return { errores: ["Descripción obligatoria."] };
  }

  if (!["BAJA", "MEDIA", "ALTA"].includes(prioridad)) {
    return { errores: ["Prioridad inválida."] };
  }

  await prisma.solicitudMantenimiento.create({
    data: {
      cuenta_id,
      descripcion,
      prioridad: prioridad as "BAJA" | "MEDIA" | "ALTA",
      estado: "PENDIENTE",
    },
  });

  revalidatePath(`/admin/cuentas/${cuenta_id}`);
  revalidatePath("/admin/mantenimiento");
  return { ok: true };
}

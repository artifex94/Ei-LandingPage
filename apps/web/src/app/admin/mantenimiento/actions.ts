"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireRol } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/constants/validation";

// Acciones invocadas como <form action={...}> (retorno void): el guard que
// redirige (requireRol) es el patrón correcto acá. El wrapper accionAdmin se
// reserva para actions invocados con useActionState/programáticamente.
export async function iniciarSolicitud(id: string): Promise<void> {
  if (!UUID_RE.test(id)) return;
  await requireRol("ADMIN");
  await prisma.solicitudMantenimiento.update({
    where: { id },
    data: { estado: "EN_PROCESO" },
  });
  revalidatePath("/admin/mantenimiento");
}

export async function reabrirSolicitud(id: string): Promise<void> {
  if (!UUID_RE.test(id)) return;
  await requireRol("ADMIN");
  await prisma.solicitudMantenimiento.update({
    where: { id },
    data: { estado: "PENDIENTE", resuelta_en: null },
  });
  revalidatePath("/admin/mantenimiento");
}

export async function resolverSolicitud(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  await requireRol("ADMIN");

  const id = (formData.get("id") as string)?.trim();
  if (!UUID_RE.test(id ?? "")) return { error: "ID inválido." };

  await prisma.solicitudMantenimiento.update({
    where: { id },
    data: { estado: "RESUELTA", resuelta_en: new Date() },
  });

  revalidatePath("/admin/mantenimiento");
  return null;
}

export interface CrearSolicitudResult {
  ok?: boolean;
  errores?: string[];
}

export async function crearSolicitudMantenimiento(
  prevState: CrearSolicitudResult,
  formData: FormData
): Promise<CrearSolicitudResult> {
  await requireRol("ADMIN");

  const cuenta_id = (formData.get("cuenta_id") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const prioridad = (formData.get("prioridad") as string) ?? "MEDIA";

  if (!UUID_RE.test(cuenta_id ?? "")) return { errores: ["Cuenta inválida."] };
  if (!descripcion) {
    return { errores: ["Descripción obligatoria."] };
  }

  if (descripcion.length > 800) {
    return { errores: ["La descripción no puede superar los 800 caracteres."] };
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

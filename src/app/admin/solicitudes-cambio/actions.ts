"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function getAdminPerfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") redirect("/portal/dashboard");

  return perfil;
}

/** Verifica unicidad del valor nuevo para campos únicos (telefono, email) */
async function verificarUnicidad(
  campo: string,
  valorNuevo: string,
  perfilId: string
): Promise<string | null> {
  if (campo !== "telefono" && campo !== "email") return null;

  const colision = await prisma.perfil.findFirst({
    where: {
      [campo]: valorNuevo,
      id: { not: perfilId },
    },
  });

  return colision
    ? `El valor "${valorNuevo}" ya está registrado para otro cliente.`
    : null;
}

// ── Aprobar cambio ────────────────────────────────────────────────────────────

export async function aprobarCambio(id: string): Promise<{ error?: string }> {
  const adminPerfil = await getAdminPerfil();

  const solicitud = await prisma.solicitudCambioInfo.findUnique({
    where: { id },
    include: { perfil: true },
  });

  if (!solicitud || solicitud.estado !== "PENDIENTE") {
    return { error: "Solicitud no encontrada o ya procesada." };
  }

  const errorUnicidad = await verificarUnicidad(
    solicitud.campo,
    solicitud.valor_nuevo,
    solicitud.perfil_id
  );

  if (errorUnicidad) {
    // Rechazar automáticamente con la razón
    await prisma.solicitudCambioInfo.update({
      where: { id },
      data: {
        estado: "RECHAZADO",
        notas_admin: errorUnicidad,
        revisado_en: new Date(),
        revisado_por: adminPerfil.nombre,
      },
    });
    revalidatePath("/admin/solicitudes-cambio");
    revalidatePath(`/admin/clientes/${solicitud.perfil_id}`);
    return { error: errorUnicidad };
  }

  await prisma.$transaction(async (tx) => {
    // Aplicar el cambio al perfil
    await tx.perfil.update({
      where: { id: solicitud.perfil_id },
      data: { [solicitud.campo]: solicitud.valor_nuevo },
    });

    // Marcar la solicitud como aprobada
    await tx.solicitudCambioInfo.update({
      where: { id },
      data: {
        estado: "APROBADO",
        revisado_en: new Date(),
        revisado_por: adminPerfil.nombre,
      },
    });
  });

  revalidatePath("/admin/solicitudes-cambio");
  revalidatePath(`/admin/clientes/${solicitud.perfil_id}`);

  return {};
}

// ── Rechazar cambio ───────────────────────────────────────────────────────────

const rechazarSchema = z.object({
  id: z.string().uuid(),
  notas_admin: z.string().max(500).optional(),
});

export async function rechazarCambio(
  _prev: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean } | null> {
  const adminPerfil = await getAdminPerfil();

  const input = rechazarSchema.safeParse({
    id: formData.get("id"),
    notas_admin: formData.get("notas_admin") || undefined,
  });

  if (!input.success) return { error: "Datos inválidos." };

  const solicitud = await prisma.solicitudCambioInfo.findUnique({
    where: { id: input.data.id },
  });

  if (!solicitud || solicitud.estado !== "PENDIENTE") {
    return { error: "Solicitud no encontrada o ya procesada." };
  }

  await prisma.solicitudCambioInfo.update({
    where: { id: input.data.id },
    data: {
      estado: "RECHAZADO",
      notas_admin: input.data.notas_admin ?? null,
      revisado_en: new Date(),
      revisado_por: adminPerfil.nombre,
    },
  });

  revalidatePath("/admin/solicitudes-cambio");
  revalidatePath(`/admin/clientes/${solicitud.perfil_id}`);

  return { error: "", ok: true };
}

// ── Editar y aprobar ──────────────────────────────────────────────────────────

const editarSchema = z.object({
  id: z.string().uuid(),
  valor_corregido: z.string().min(1, "El valor no puede estar vacío.").max(500),
});

export async function editarYAprobarCambio(
  _prev: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean } | null> {
  const adminPerfil = await getAdminPerfil();

  const input = editarSchema.safeParse({
    id: formData.get("id"),
    valor_corregido: formData.get("valor_corregido"),
  });

  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const solicitud = await prisma.solicitudCambioInfo.findUnique({
    where: { id: input.data.id },
  });

  if (!solicitud || solicitud.estado !== "PENDIENTE") {
    return { error: "Solicitud no encontrada o ya procesada." };
  }

  const errorUnicidad = await verificarUnicidad(
    solicitud.campo,
    input.data.valor_corregido,
    solicitud.perfil_id
  );

  if (errorUnicidad) return { error: errorUnicidad };

  await prisma.$transaction(async (tx) => {
    await tx.perfil.update({
      where: { id: solicitud.perfil_id },
      data: { [solicitud.campo]: input.data.valor_corregido },
    });

    await tx.solicitudCambioInfo.update({
      where: { id: input.data.id },
      data: {
        valor_nuevo: input.data.valor_corregido,
        estado: "APROBADO",
        revisado_en: new Date(),
        revisado_por: adminPerfil.nombre,
      },
    });
  });

  revalidatePath("/admin/solicitudes-cambio");
  revalidatePath(`/admin/clientes/${solicitud.perfil_id}`);

  return { error: "", ok: true };
}

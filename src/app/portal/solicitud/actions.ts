"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const solicitudSchema = z.object({
  cuenta_id: z.string().uuid("Seleccioná un servicio válido."),
  descripcion: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres.")
    .max(1000),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]),
});

export async function crearSolicitud(
  _prev: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const input = solicitudSchema.safeParse({
    cuenta_id: formData.get("cuenta_id"),
    descripcion: formData.get("descripcion"),
    prioridad: formData.get("prioridad"),
  });

  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Verificar que la cuenta pertenece al usuario
  const cuenta = await prisma.cuenta.findFirst({
    where: { id: input.data.cuenta_id, perfil_id: user.id },
  });

  if (!cuenta) return { error: "Servicio no encontrado." };

  await prisma.solicitudMantenimiento.create({
    data: {
      cuenta_id: input.data.cuenta_id,
      descripcion: input.data.descripcion,
      prioridad: input.data.prioridad,
    },
  });

  revalidatePath(`/portal/cuentas/${input.data.cuenta_id}`);

  return { error: "", ok: true };
}

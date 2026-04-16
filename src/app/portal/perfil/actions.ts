"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const CAMPOS_PERMITIDOS = ["nombre", "telefono", "email"] as const;
type CampoPermitido = (typeof CAMPOS_PERMITIDOS)[number];

const schema = z.object({
  campo: z.enum(CAMPOS_PERMITIDOS, { message: "Campo no permitido." }),
  valor_nuevo: z
    .string()
    .min(1, "El valor no puede estar vacío.")
    .max(500, "El valor es demasiado largo."),
});

const CAMPO_LABELS: Record<CampoPermitido, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
};

export async function crearSolicitudCambio(
  _prev: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const input = schema.safeParse({
    campo: formData.get("campo"),
    valor_nuevo: formData.get("valor_nuevo"),
  });

  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { campo, valor_nuevo } = input.data;

  // Verificar que el perfil existe
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (!perfil) redirect("/login");

  // Bloquear si ya hay una solicitud PENDIENTE para el mismo campo
  const pendiente = await prisma.solicitudCambioInfo.findFirst({
    where: { perfil_id: user.id, campo, estado: "PENDIENTE" },
  });
  if (pendiente) {
    return {
      error: `Ya tenés una solicitud de cambio de ${CAMPO_LABELS[campo]} pendiente de revisión.`,
    };
  }

  // Obtener valor actual
  const valor_actual = (perfil[campo] as string | null) ?? null;

  // No tiene sentido solicitar el mismo valor que ya está guardado
  if (valor_actual?.trim() === valor_nuevo.trim()) {
    return { error: "El valor propuesto es igual al actual." };
  }

  await prisma.solicitudCambioInfo.create({
    data: {
      perfil_id: user.id,
      campo,
      valor_actual,
      valor_nuevo: valor_nuevo.trim(),
    },
  });

  revalidatePath("/portal/perfil");

  return { error: "", ok: true };
}

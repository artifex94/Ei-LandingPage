"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export interface ConfirmarResult {
  ok?: boolean;
  error?: string;
}

export async function confirmarTransferencia(
  prevState: ConfirmarResult,
  formData: FormData
): Promise<ConfirmarResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") return { error: "Sin permisos de administrador." };

  const pagoId = formData.get("pago_id") as string;
  if (!pagoId) return { error: "ID de pago inválido." };

  await prisma.pago.update({
    where: { id: pagoId },
    data: {
      estado: "PAGADO",
      acreditado_en: new Date(),
      registrado_por: perfil.nombre ?? "Admin",
    },
  });

  revalidatePath("/admin/pagos");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarAdjuntoFeedback } from "@/lib/feedback-adjunto";

const BUCKET_ADJUNTOS = "feedback-adjuntos";

const feedbackSchema = z.object({
  tipo: z.enum(["BUG", "MEJORA"]),
  descripcion: z
    .string()
    .min(10, "Contanos un poco más — mínimo 10 caracteres.")
    .max(2000, "La descripción no puede superar los 2000 caracteres."),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
});

export interface CrearTicketFeedbackResult {
  error: string;
  ok?: boolean;
  avisoAdjunto?: string;
}

export async function crearTicketFeedback(
  _prev: CrearTicketFeedbackResult | null,
  formData: FormData
): Promise<CrearTicketFeedbackResult> {
  const sesion = await requireSesion();
  if (sesion.impersonacion) {
    return { error: "Vista de administrador: el portal está en solo lectura." };
  }
  const { userId } = sesion;

  const input = feedbackSchema.safeParse({
    tipo: formData.get("tipo"),
    descripcion: formData.get("descripcion"),
    prioridad: formData.get("prioridad"),
  });

  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const archivo = formData.get("adjunto");
  const tieneArchivo = archivo instanceof File && archivo.size > 0;

  if (tieneArchivo) {
    const validacion = validarAdjuntoFeedback({ mime: archivo.type, size: archivo.size });
    if (!validacion.ok) return { error: validacion.error };
  }

  let adjunto_url: string | undefined;
  let adjunto_mime: string | undefined;
  let avisoAdjunto: string | undefined;

  if (tieneArchivo) {
    try {
      const supabaseAdmin = createAdminClient();
      const ext = archivo.name.split(".").pop() || "bin";
      const filename = `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_ADJUNTOS)
        .upload(filename, archivo, { contentType: archivo.type, upsert: false });

      if (uploadError) {
        console.error("[feedback/crearTicket] Supabase storage error:", uploadError.message);
        avisoAdjunto = "No pudimos subir el archivo adjunto, pero tu reporte se envió igual.";
      } else {
        const { data } = supabaseAdmin.storage.from(BUCKET_ADJUNTOS).getPublicUrl(filename);
        adjunto_url = data.publicUrl;
        adjunto_mime = archivo.type;
      }
    } catch (err) {
      console.error("[feedback/crearTicket] Error inesperado al subir adjunto:", err);
      avisoAdjunto = "No pudimos subir el archivo adjunto, pero tu reporte se envió igual.";
    }
  }

  try {
    await prisma.ticketFeedback.create({
      data: {
        perfil_id: userId,
        tipo: input.data.tipo,
        descripcion: input.data.descripcion,
        prioridad: input.data.prioridad,
        adjunto_url,
        adjunto_mime,
      },
    });
  } catch (err) {
    // Misma degradación que las lecturas: si la tabla todavía no existe en
    // Supabase (SQL manual pendiente), el cliente ve un error amable.
    console.error("[feedback/crearTicket] Error al guardar el ticket:", err);
    return { error: "No pudimos guardar tu reporte. Probá de nuevo más tarde." };
  }

  revalidatePath("/portal/feedback");
  revalidatePath("/admin/feedback");

  return { error: "", ok: true, avisoAdjunto };
}

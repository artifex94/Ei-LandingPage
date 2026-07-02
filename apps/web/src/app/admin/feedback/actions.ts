"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { registrarAuditTx } from "@/lib/audit";
import { UUID_RE } from "@/lib/constants/validation";
import type { EstadoTicketFeedback } from "@/generated/prisma/client";

const ACCIONES_VALIDAS = new Set<EstadoTicketFeedback>(["EN_REVISION", "RESUELTO", "DESCARTADO"]);

export interface ActualizarTicketFeedbackResult {
  error?: string;
  ok?: boolean;
}

export async function actualizarTicketFeedback(
  _prev: ActualizarTicketFeedbackResult | null,
  formData: FormData
): Promise<ActualizarTicketFeedbackResult> {
  const admin = await requireAdmin();

  const id = (formData.get("id") as string)?.trim();
  const accion = (formData.get("accion") as string)?.trim() as EstadoTicketFeedback;
  const notaRaw = (formData.get("nota_admin") as string)?.trim();
  const nota_admin = notaRaw ? notaRaw : null;

  if (!UUID_RE.test(id ?? "")) return { error: "Ticket inválido." };
  if (!ACCIONES_VALIDAS.has(accion)) return { error: "Acción inválida." };

  const ticket = await prisma.ticketFeedback.findUnique({ where: { id } });
  if (!ticket) return { error: "El ticket no existe." };

  const esCierre = accion === "RESUELTO" || accion === "DESCARTADO";

  await prisma.$transaction(async (tx) => {
    await tx.ticketFeedback.update({
      where: { id },
      data: {
        estado: accion,
        // El form siempre envía el textarea completo (precargado con la nota
        // actual): vaciarlo significa borrar la nota, no "sin cambios".
        nota_admin,
        resuelto_en: esCierre ? new Date() : null,
      },
    });
    await registrarAuditTx(tx, {
      admin_id: admin.id,
      admin_nombre: admin.nombre,
      accion: "TICKET_FEEDBACK_ACTUALIZADO",
      entidad: "ticket_feedback",
      entidad_id: id,
      state_transition: { prior_state: ticket.estado, new_state: accion },
      detalle: { nota_admin },
    });
  });

  revalidatePath("/admin/feedback");
  revalidatePath("/portal/feedback");
  return { ok: true };
}

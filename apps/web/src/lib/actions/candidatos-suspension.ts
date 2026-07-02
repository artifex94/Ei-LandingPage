"use server";

import { revalidatePath } from "next/cache";
import { requireCapacidad } from "@/lib/auth/session";
import { registrarAuditTx } from "@/lib/audit";
import { prisma } from "@/lib/prisma/client";

/**
 * Resolución humana de la cola "A suspender hoy" (Fase 3 del plan maestro).
 * El cron solo genera candidatos; suspender o condonar es SIEMPRE decisión del
 * tesorero, guardada con `justification` obligatoria en el AuditLog.
 */

export interface CandidatoSuspensionActionResult {
  ok?: boolean;
  error?: string;
}

async function obtenerCandidatoAbierto(candidato_id: string) {
  return prisma.candidatoSuspension.findFirst({
    where: { id: candidato_id, resuelto_en: null },
    select: {
      id: true,
      cuenta_id: true,
      dpd: true,
      deuda_total: true,
      cuenta: { select: { estado: true } },
    },
  });
}

function validarInput(formData: FormData): { candidato_id: string; justificacion: string } | { error: string } {
  const candidato_id = (formData.get("candidato_id") as string)?.trim();
  const justificacion = (formData.get("justificacion") as string)?.trim();

  if (!candidato_id) return { error: "Candidato inválido." };
  if (!justificacion || justificacion.length < 10) {
    return { error: "La justificación debe tener al menos 10 caracteres." };
  }
  return { candidato_id, justificacion };
}

/** Suspende la cuenta (escribe Cuenta.estado = SUSPENDIDA_PAGO) y cierra el candidato. */
export async function suspenderCandidato(
  _prevState: CandidatoSuspensionActionResult,
  formData: FormData,
): Promise<CandidatoSuspensionActionResult> {
  // Mismo gate que el layout de /cobros: ADMIN o empleado con puede_facturar.
  const admin = await requireCapacidad("puede_facturar");

  const input = validarInput(formData);
  if ("error" in input) return input;

  const candidato = await obtenerCandidatoAbierto(input.candidato_id);
  if (!candidato) return { error: "El candidato ya fue resuelto o no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.cuenta.update({
      where: { id: candidato.cuenta_id },
      data: { estado: "SUSPENDIDA_PAGO" },
    });
    await tx.candidatoSuspension.update({
      where: { id: candidato.id },
      data: { resuelto_en: new Date(), accion: "SUSPENDIDA" },
    });
    await registrarAuditTx(tx, {
      admin_id: admin.id,
      admin_nombre: admin.nombre,
      accion: "CUENTA_SUSPENDIDA_POR_MORA",
      entidad: "cuenta",
      entidad_id: candidato.cuenta_id,
      state_transition: { prior_state: candidato.cuenta.estado, new_state: "SUSPENDIDA_PAGO" },
      justification: input.justificacion,
      detalle: {
        candidato_id: candidato.id,
        dpd: candidato.dpd,
        deuda_total: Number(candidato.deuda_total),
      },
    });
  });

  revalidatePath("/cobros");
  revalidatePath("/admin/morosidad");
  return { ok: true };
}

/** Condona la mora: cierra el candidato sin tocar el estado de la cuenta. */
export async function condonarCandidato(
  _prevState: CandidatoSuspensionActionResult,
  formData: FormData,
): Promise<CandidatoSuspensionActionResult> {
  const admin = await requireCapacidad("puede_facturar");

  const input = validarInput(formData);
  if ("error" in input) return input;

  const candidato = await obtenerCandidatoAbierto(input.candidato_id);
  if (!candidato) return { error: "El candidato ya fue resuelto o no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.candidatoSuspension.update({
      where: { id: candidato.id },
      data: { resuelto_en: new Date(), accion: "CONDONADA" },
    });
    await registrarAuditTx(tx, {
      admin_id: admin.id,
      admin_nombre: admin.nombre,
      accion: "SUSPENSION_CONDONADA",
      entidad: "cuenta",
      entidad_id: candidato.cuenta_id,
      state_transition: { prior_state: candidato.cuenta.estado, new_state: candidato.cuenta.estado },
      justification: input.justificacion,
      detalle: {
        candidato_id: candidato.id,
        dpd: candidato.dpd,
        deuda_total: Number(candidato.deuda_total),
      },
    });
  });

  revalidatePath("/cobros");
  revalidatePath("/admin/morosidad");
  return { ok: true };
}

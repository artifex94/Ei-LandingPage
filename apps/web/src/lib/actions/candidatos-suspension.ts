"use server";

import { revalidatePath } from "next/cache";
import { requireCapacidad } from "@/lib/auth/session";
import { registrarAuditTx } from "@/lib/audit";
import { prisma } from "@/lib/prisma/client";
import { resumenDeudaCuentas } from "@/lib/billing-deuda";

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

  // El candidato guarda dpd/deuda del último cron (hasta 1 mes de antigüedad).
  // Si el cliente pagó después de esa corrida, suspenderlo con esos datos
  // stale sería un error operativo — re-consultamos la deuda real (mismo
  // criterio que `resumenDeudaCuentas`, ya usado en /admin/morosidad y en el
  // cron de cierre mensual) ANTES de tocar el estado de la cuenta.
  const pagosImpagos = await prisma.pago.findMany({
    where: { cuenta_id: candidato.cuenta_id, estado: { in: ["PENDIENTE", "VENCIDO"] } },
    select: { mes: true, anio: true, importe: true, estado: true },
  });
  const { deudaTotal } = resumenDeudaCuentas(
    pagosImpagos.map((p) => ({ ...p, importe: Number(p.importe) })),
  );

  if (deudaTotal <= 0) {
    await prisma.$transaction(async (tx) => {
      await tx.candidatoSuspension.update({
        where: { id: candidato.id },
        data: { resuelto_en: new Date(), accion: "PAGO_RECIBIDO" },
      });
      await registrarAuditTx(tx, {
        admin_id: admin.id,
        admin_nombre: admin.nombre,
        accion: "SUSPENSION_EVITADA_CUENTA_AL_DIA",
        entidad: "cuenta",
        entidad_id: candidato.cuenta_id,
        state_transition: { prior_state: candidato.cuenta.estado, new_state: candidato.cuenta.estado },
        justification: input.justificacion,
        detalle: {
          candidato_id: candidato.id,
          dpd_cron: candidato.dpd,
          deuda_total_cron: Number(candidato.deuda_total),
        },
      });
    });

    revalidatePath("/cobros");
    revalidatePath("/admin/morosidad");
    return { error: "La cuenta ya está al día — no se suspendió. El candidato se cerró como pago recibido." };
  }

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
        deuda_total: deudaTotal,
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

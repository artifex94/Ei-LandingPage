"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { softguardWebApiConfigured, fetchContactosCuenta } from "@/lib/softguard/api";
import { CAMPO_ORDEN_AVISOS, formatOrdenLegible } from "@/lib/solicitudes-cambio";

const ordenSchema = z.object({
  cuenta_id: z.string().uuid(),
  // Orden propuesto por el cliente (lista de contactos en la prioridad deseada).
  orden: z
    .array(
      z.object({
        nombre: z.string().max(120),
        telefono: z.string().max(40).nullable().optional(),
        rol: z.string().max(120).nullable().optional(),
      }),
    )
    .min(1, "No hay contactos para reordenar.")
    .max(50, "Demasiados contactos."),
});

/**
 * Solicitud del cliente para reordenar la prioridad de los contactos de aviso de una cuenta.
 * SoftGuard es solo-lectura: NO se aplica acá — se guarda como `SolicitudCambioInfo`
 * (campo "orden_avisos") y el admin lo aplica a mano en la central y la aprueba.
 * `valor_actual` se toma de la central (autoritativo); `valor_nuevo` es el orden propuesto.
 */
export async function crearSolicitudReordenContactos(
  _prev: { error: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error: string; ok?: boolean } | null> {
  const sesion = await requireSesion();
  if (sesion.impersonacion) {
    return { error: "Vista de administrador: el portal está en solo lectura." };
  }
  const { userId } = sesion;

  let ordenRaw: unknown;
  try {
    ordenRaw = JSON.parse(String(formData.get("orden") ?? "[]"));
  } catch {
    return { error: "Datos inválidos." };
  }

  const input = ordenSchema.safeParse({ cuenta_id: formData.get("cuenta_id"), orden: ordenRaw });
  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Pertenencia: la cuenta debe ser del cliente logueado.
  const cuenta = await prisma.cuenta.findFirst({
    where: { id: input.data.cuenta_id, perfil_id: userId },
    select: { id: true, iid_softguard: true },
  });
  if (!cuenta) return { error: "Servicio no encontrado." };

  // No acumular: una sola solicitud de orden pendiente por cuenta.
  const pendiente = await prisma.solicitudCambioInfo.findFirst({
    where: { perfil_id: userId, cuenta_id: cuenta.id, campo: CAMPO_ORDEN_AVISOS, estado: "PENDIENTE" },
    select: { id: true },
  });
  if (pendiente) return { error: "Ya tenés un pedido de reordenamiento pendiente para esta cuenta." };

  // Orden vigente (autoritativo desde la central) para que el admin compare.
  let valorActual: string | null = null;
  if (cuenta.iid_softguard && softguardWebApiConfigured()) {
    try {
      const actuales = await fetchContactosCuenta(cuenta.iid_softguard);
      if (actuales.length) valorActual = formatOrdenLegible(actuales);
    } catch {
      // best-effort: si la central no responde, el admin igual ve el orden propuesto
    }
  }

  const valorNuevo = formatOrdenLegible(input.data.orden);
  if (valorActual && valorActual === valorNuevo) {
    return { error: "El orden propuesto es igual al actual." };
  }

  await prisma.solicitudCambioInfo.create({
    data: {
      perfil_id: userId,
      cuenta_id: cuenta.id,
      campo: CAMPO_ORDEN_AVISOS,
      valor_actual: valorActual,
      valor_nuevo: valorNuevo,
    },
  });

  revalidatePath(`/portal/cuentas/${cuenta.id}`);
  revalidatePath("/portal/perfil");

  return { error: "", ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit, registrarAuditTx } from "@/lib/audit";
import { requireAdmin } from "@/lib/actions/auth";
import { UUID_RE } from "@/lib/constants/validation";

// Señaliza que el pago cambió de estado entre el snapshot y el borrado
// (control de concurrencia optimista en anularPago).
class PagoModificadoError extends Error {}

export interface ConfirmarResult {
  ok?: boolean;
  error?: string;
}

export interface PagoEditResult {
  ok?: boolean;
  errores?: string[];
}

const editarPagoSchema = z.object({
  pago_id: z.string().uuid("ID de pago inválido."),
  estado: z.enum(["PENDIENTE", "PAGADO", "VENCIDO", "PROCESANDO"]),
  importe: z.coerce.number().min(0),
  metodo: z.enum(["EFECTIVO", "CHEQUE", "MERCADOPAGO", "TALO_CVU", "TRANSFERENCIA_BANCARIA"]).optional().nullable(),
});

export async function editarPago(
  prevState: PagoEditResult,
  formData: FormData
): Promise<PagoEditResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = editarPagoSchema.safeParse({
    pago_id: formData.get("pago_id"),
    estado: formData.get("estado"),
    importe: formData.get("importe"),
    metodo: formData.get("metodo") || null,
  });

  if (!parsed.success) return { errores: parsed.error.issues.map((i) => i.message) };

  const { pago_id, estado, importe, metodo } = parsed.data;

  const pagoAntes = await prisma.pago.findUnique({
    where: { id: pago_id },
    select: { estado: true, importe: true, metodo: true, cuenta_id: true },
  });
  if (!pagoAntes) return { errores: ["Pago no encontrado."] };

  await prisma.pago.update({
    where: { id: pago_id },
    data: {
      estado,
      importe,
      ...(metodo !== undefined ? { metodo } : {}),
      ...(estado === "PAGADO" ? { acreditado_en: new Date(), registrado_por: admin.nombre } : {}),
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "PAGO_EDITADO",
    entidad: "pago",
    entidad_id: pago_id,
    detalle: {
      antes: { estado: pagoAntes.estado, importe: Number(pagoAntes.importe), metodo: pagoAntes.metodo },
      despues: { estado, importe, metodo },
    },
  });

  revalidatePath("/admin/pagos");
  return { ok: true };
}

export async function anularPago(pagoId: string): Promise<{ error?: string }> {
  if (!UUID_RE.test(pagoId)) return { error: "ID de pago inválido." };
  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos de administrador." };

  // Snapshot COMPLETO antes de borrar: tras el delete, este registro de
  // auditoría es la ÚNICA copia que queda del pago.
  const pago = await prisma.pago.findUnique({ where: { id: pagoId } });
  if (!pago) return { error: "Pago no encontrado." };
  if (pago.estado === "PROCESANDO") return { error: "No se puede anular un pago en proceso de acreditación." };

  // Audit + delete atómicos, con concurrencia optimista: el delete solo procede
  // si el estado sigue siendo el del snapshot. Si un webhook de pago (MP/Talo)
  // cambió el pago entremedio, deleteMany afecta 0 filas y abortamos la
  // transacción (revirtiendo el audit) en vez de borrar un pago recién acreditado.
  try {
    await prisma.$transaction(async (tx) => {
      await registrarAuditTx(tx, {
        admin_id: admin.id,
        admin_nombre: admin.nombre,
        accion: "PAGO_ANULADO",
        entidad: "pago",
        entidad_id: pagoId,
        detalle: {
          cuenta_id: pago.cuenta_id,
          mes: pago.mes,
          anio: pago.anio,
          importe: Number(pago.importe),
          estado: pago.estado,
          metodo: pago.metodo,
          ref_externa: pago.ref_externa,
          acreditado_en: pago.acreditado_en,
          registrado_por: pago.registrado_por,
          factura_id: pago.factura_id,
        },
      });
      const { count } = await tx.pago.deleteMany({
        where: { id: pagoId, estado: pago.estado },
      });
      if (count !== 1) throw new PagoModificadoError();
    });
  } catch (e) {
    if (e instanceof PagoModificadoError) {
      return { error: "El pago cambió de estado mientras lo anulabas. Recargá y reintentá." };
    }
    throw e;
  }

  revalidatePath("/admin/pagos");
  return {};
}

export async function confirmarTransferencia(
  prevState: ConfirmarResult,
  formData: FormData
): Promise<ConfirmarResult> {
  const admin = await requireAdmin();

  const pagoId = (formData.get("pago_id") as string ?? "").trim();
  if (!UUID_RE.test(pagoId)) return { error: "ID de pago inválido." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pago.update({
        where: { id: pagoId },
        data: {
          estado: "PAGADO",
          acreditado_en: new Date(),
          registrado_por: admin.nombre ?? "Admin",
        },
      });
      await registrarAuditTx(tx, {
        admin_id: admin.id,
        admin_nombre: admin.nombre ?? "Admin",
        accion: "TRANSFERENCIA_CONFIRMADA",
        entidad: "pago",
        entidad_id: pagoId,
        state_transition: { prior_state: "PROCESANDO", new_state: "PAGADO" },
      });
    });
  } catch (e: unknown) {
    // P2025: registro no encontrado
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return { error: "Pago no encontrado." };
    }
    throw e;
  }

  revalidatePath("/admin/pagos");
  return { ok: true };
}

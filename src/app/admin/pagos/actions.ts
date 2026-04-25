"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";

export interface ConfirmarResult {
  ok?: boolean;
  error?: string;
}

export interface PagoEditResult {
  ok?: boolean;
  errores?: string[];
}

async function requireAdminForPagos() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") return null;
  return perfil;
}

const editarPagoSchema = z.object({
  pago_id: z.string().min(1),
  estado: z.enum(["PENDIENTE", "PAGADO", "VENCIDO", "PROCESANDO"]),
  importe: z.coerce.number().min(0),
  metodo: z.enum(["EFECTIVO", "CHEQUE", "MERCADOPAGO", "TALO_CVU", "TRANSFERENCIA_BANCARIA"]).optional().nullable(),
});

export async function editarPago(
  prevState: PagoEditResult,
  formData: FormData
): Promise<PagoEditResult> {
  const admin = await requireAdminForPagos();
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
  const admin = await requireAdminForPagos();
  if (!admin) return { error: "Sin permisos de administrador." };

  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    select: { estado: true, mes: true, anio: true, cuenta_id: true },
  });
  if (!pago) return { error: "Pago no encontrado." };
  if (pago.estado === "PROCESANDO") return { error: "No se puede anular un pago en proceso de acreditación." };

  await prisma.pago.delete({ where: { id: pagoId } });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "PAGO_ANULADO",
    entidad: "pago",
    entidad_id: pagoId,
    detalle: { mes: pago.mes, anio: pago.anio, cuenta_id: pago.cuenta_id },
  });

  revalidatePath("/admin/pagos");
  return {};
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

  try {
    await prisma.pago.update({
      where: { id: pagoId },
      data: {
        estado: "PAGADO",
        acreditado_en: new Date(),
        registrado_por: perfil.nombre ?? "Admin",
      },
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

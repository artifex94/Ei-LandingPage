"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const actualizarCuentaSchema = z.object({
  id: z.string().min(1),
  descripcion: z.string().min(1, "La dirección es obligatoria"),
  categoria: z.enum([
    "ALARMA_MONITOREO",
    "DOMOTICA",
    "CAMARA_CCTV",
    "ANTENA_STARLINK",
    "OTRO",
  ]),
  estado: z.enum([
    "ACTIVA",
    "SUSPENDIDA_PAGO",
    "EN_MANTENIMIENTO",
    "BAJA_DEFINITIVA",
  ]),
  costo_mensual: z.coerce.number().min(0),
});

export interface CuentaActionResult {
  ok?: boolean;
  errores?: string[];
}

export async function actualizarCuenta(
  prevState: CuentaActionResult,
  formData: FormData
): Promise<CuentaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") {
    return { errores: ["Sin permisos de administrador."] };
  }

  const parsed = actualizarCuentaSchema.safeParse({
    id: formData.get("id"),
    descripcion: formData.get("descripcion"),
    categoria: formData.get("categoria"),
    estado: formData.get("estado"),
    costo_mensual: formData.get("costo_mensual"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { id, ...data } = parsed.data;

  await prisma.cuenta.update({ where: { id }, data });

  revalidatePath(`/admin/cuentas/${id}`);
  revalidatePath("/admin/cuentas");
  return { ok: true };
}

const pagoManualSchema = z.object({
  cuenta_id: z.string().min(1),
  mes: z.coerce.number().min(1).max(12),
  anio: z.coerce.number().min(2020),
  importe: z.coerce.number().min(0),
  metodo: z.enum(["EFECTIVO", "CHEQUE", "MERCADOPAGO", "TALO_CVU"]),
});

export async function registrarPagoManual(
  prevState: CuentaActionResult,
  formData: FormData
): Promise<CuentaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") {
    return { errores: ["Sin permisos de administrador."] };
  }

  const parsed = pagoManualSchema.safeParse({
    cuenta_id: formData.get("cuenta_id"),
    mes: formData.get("mes"),
    anio: formData.get("anio"),
    importe: formData.get("importe"),
    metodo: formData.get("metodo"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { cuenta_id, mes, anio, importe, metodo } = parsed.data;

  await prisma.pago.upsert({
    where: { cuenta_id_mes_anio: { cuenta_id, mes, anio } },
    create: {
      cuenta_id,
      mes,
      anio,
      importe,
      metodo,
      estado: "PAGADO",
      acreditado_en: new Date(),
    },
    update: {
      importe,
      metodo,
      estado: "PAGADO",
      acreditado_en: new Date(),
    },
  });

  revalidatePath("/admin/pagos");
  revalidatePath(`/admin/clientes`);
  return { ok: true };
}

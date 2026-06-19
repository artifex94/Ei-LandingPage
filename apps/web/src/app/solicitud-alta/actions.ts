"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { enviarWhatsApp } from "@/lib/twilio";

export interface SolicitudAltaResult {
  ok?: boolean;
  errores?: string[];
}

const CONDICION_IVA_VALIDAS = new Set([
  "RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA", "EXENTO", "CONSUMIDOR_FINAL", "NO_RESPONSABLE",
]);

const schema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar los 100 caracteres")
    .transform((v) => v.trim()),
  telefono: z
    .string()
    .regex(/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos"),
  dni: z
    .string()
    .optional()
    .transform((v) => v?.replace(/\D/g, "") || undefined)
    .refine((v) => !v || /^\d{7,8}$/.test(v), "El DNI debe tener 7 u 8 dígitos"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  tipo_titular: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  requiere_factura: z
    .enum(["true", "false"])
    .transform((v) => v === "true"),
  razon_social: z
    .string()
    .max(200, "La razón social no puede superar los 200 caracteres")
    .optional()
    .transform((v) => v?.trim() || undefined),
  cuit: z
    .string()
    .optional()
    .transform((v) => v?.replace(/\D/g, "") || undefined)
    .refine((v) => !v || /^\d{11}$/.test(v), "El CUIT debe tener 11 dígitos"),
  condicion_iva: z
    .string()
    .optional()
    .refine((v) => !v || CONDICION_IVA_VALIDAS.has(v), "Condición de IVA inválida")
    .transform((v) => v || undefined),
});

export async function enviarSolicitudAlta(
  prevState: SolicitudAltaResult,
  formData: FormData
): Promise<SolicitudAltaResult> {
  const raw = {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono"),
    dni: formData.get("dni"),
    email: formData.get("email"),
    tipo_titular: formData.get("tipo_titular"),
    requiere_factura: (formData.get("requiere_factura") as string) ?? "false",
    razon_social: formData.get("razon_social"),
    cuit: formData.get("cuit"),
    condicion_iva: formData.get("condicion_iva"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const {
    nombre,
    telefono,
    dni,
    email,
    tipo_titular,
    requiere_factura,
    razon_social,
    cuit,
    condicion_iva,
  } = parsed.data;

  // Validate billing fields when invoice is required
  if (requiere_factura) {
    const billingErrors: string[] = [];
    if (!razon_social) billingErrors.push("La razón social es obligatoria para facturación.");
    if (!cuit) billingErrors.push("El CUIT es obligatorio para facturación.");
    if (!condicion_iva) billingErrors.push("La condición de IVA es obligatoria para facturación.");
    if (billingErrors.length > 0) return { errores: billingErrors };
  }

  // Rate limit: 1 submission per phone per 5 minutes (any status)
  const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
  const reciente = await prisma.altaUsuario.findFirst({
    where: { telefono, created_at: { gte: cincoMinutosAtras } },
  });
  if (reciente) {
    return {
      errores: ["Esperá unos minutos antes de enviar otra solicitud."],
    };
  }

  // Block duplicate pending submissions
  const yaExiste = await prisma.altaUsuario.findFirst({
    where: { telefono, estado: "PENDIENTE" },
  });
  if (yaExiste) {
    return {
      errores: [
        "Ya tenemos una solicitud pendiente para este número. Te contactaremos pronto.",
      ],
    };
  }

  await prisma.altaUsuario.create({
    data: {
      nombre,
      telefono,
      ...(dni && { dni }),
      ...(email && { email }),
      ...(tipo_titular && { tipo_titular }),
      requiere_factura,
      ...(razon_social && { razon_social }),
      ...(cuit && { cuit }),
      ...(condicion_iva && { condicion_iva }),
    },
  });

  // Notify admin (Ramiro) — non-blocking
  const ramiroTel = process.env.RAMIRO_TELEFONO;
  if (ramiroTel) {
    enviarWhatsApp(
      ramiroTel,
      `🆕 *Nueva solicitud de alta*\n\n*Nombre:* ${nombre}\n*Tel:* ${telefono}${dni ? `\n*DNI:* ${dni}` : ""}\n\nRevisá en /admin/solicitudes-alta`
    ).catch(() => {});
  }

  // Confirm to client — may fail outside 24h window
  enviarWhatsApp(
    telefono,
    `Hola ${nombre.split(" ")[0]}! Recibimos tu solicitud de alta en Escobar Instalaciones. Te avisamos por este WhatsApp cuando tu acceso esté listo.`
  ).catch(() => {});

  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarWhatsApp, enviarWhatsAppTemplate } from "@/lib/twilio";
import { registrarAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/actions/auth";

export interface AltaActionResult {
  ok?: boolean;
  errores?: string[];
}

async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function procesarAltaUsuario(
  prevState: AltaActionResult,
  formData: FormData
): Promise<AltaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const altaId = (formData.get("altaId") as string)?.trim();
  if (!altaId) return { errores: ["ID de solicitud inválido."] };

  const alta = await prisma.altaUsuario.findUnique({ where: { id: altaId } });
  if (!alta) return { errores: ["Solicitud no encontrada."] };
  if (alta.estado !== "PENDIENTE") {
    return { errores: ["Esta solicitud ya fue procesada o rechazada."] };
  }

  const emailDomain = process.env.ADMIN_EMAIL_DOMAIN ?? "interno.ei.local";

  // Check if a Perfil already exists by DNI or phone
  let perfilExistente = null;
  if (alta.dni) {
    perfilExistente = await prisma.perfil.findUnique({ where: { dni: alta.dni } });
  }
  if (!perfilExistente && alta.telefono) {
    perfilExistente = await prisma.perfil.findFirst({ where: { telefono: alta.telefono } });
  }

  let perfilId: string;
  let perfilEmail: string;

  const adminAuth = createAdminClient();

  if (perfilExistente) {
    // Update existing perfil
    await prisma.perfil.update({
      where: { id: perfilExistente.id },
      data: {
        nombre: alta.nombre,
        telefono: alta.telefono,
        ...(alta.email && { email: alta.email }),
        ...(alta.dni && { dni: alta.dni }),
        ...(alta.tipo_titular && { tipo_titular: alta.tipo_titular as never }),
        requiere_factura: alta.requiere_factura,
        ...(alta.razon_social && { razon_social: alta.razon_social }),
        ...(alta.cuit && { cuit: alta.cuit }),
        ...(alta.condicion_iva && { condicion_iva: alta.condicion_iva as never }),
      },
    });
    perfilId = perfilExistente.id;
    perfilEmail = perfilExistente.email ?? "";

    if (!perfilEmail) {
      return { errores: ["El perfil existente no tiene email. Editalo manualmente primero."] };
    }
  } else {
    // Create new Supabase Auth user + Perfil
    const resolvedEmail = alta.email
      ? alta.email
      : alta.dni
      ? `dni_${alta.dni}@${emailDomain}`
      : `tel_${alta.telefono}@${emailDomain}`;

    const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
      email: resolvedEmail,
      user_metadata: { nombre: alta.nombre },
      email_confirm: true,
    });

    if (authError || !authData?.user?.id) {
      return { errores: [`Error al crear usuario: ${authError?.message ?? "sin datos"}`] };
    }

    const authId = authData.user.id;

    try {
      await prisma.perfil.create({
        data: {
          id: authId,
          nombre: alta.nombre,
          telefono: alta.telefono,
          email: resolvedEmail,
          rol: "CLIENTE",
          ...(alta.dni && { dni: alta.dni }),
          ...(alta.tipo_titular && { tipo_titular: alta.tipo_titular as never }),
          requiere_factura: alta.requiere_factura,
          ...(alta.razon_social && { razon_social: alta.razon_social }),
          ...(alta.cuit && { cuit: alta.cuit }),
          ...(alta.condicion_iva && { condicion_iva: alta.condicion_iva as never }),
        },
      });
    } catch (err) {
      // Rollback Supabase user if Prisma fails
      await adminAuth.auth.admin.deleteUser(authId);
      const msg = err instanceof Error ? err.message : "Error desconocido";
      return { errores: [`Error al crear perfil: ${msg}`] };
    }

    perfilId = authId;
    perfilEmail = resolvedEmail;
  }

  // Generate magic link
  const appUrl = await getAppUrl();
  const { data: linkData, error: linkError } = await adminAuth.auth.admin.generateLink({
    type: "magiclink",
    email: perfilEmail,
    options: { redirectTo: `${appUrl}/auth/callback` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("generateLink error:", linkError);
    return { errores: ["No se pudo generar el link de acceso. Intentá de nuevo."] };
  }

  const nombre = alta.nombre.split(" ")[0];
  const actionLink = linkData.properties.action_link;
  const loginTemplateSid = process.env.TWILIO_TEMPLATE_LOGIN;

  if (loginTemplateSid) {
    const sent = await enviarWhatsAppTemplate(alta.telefono, loginTemplateSid, { "1": nombre });
    if (sent) {
      await enviarWhatsApp(alta.telefono, actionLink).catch(() => {});
    }
  } else {
    await enviarWhatsApp(
      alta.telefono,
      `Hola ${nombre}! Tu acceso a Escobar Instalaciones está listo:\n\n${actionLink}\n\nEl link expira en 1 hora.`
    ).catch(() => {});
  }

  // Mark request as processed
  await prisma.altaUsuario.update({
    where: { id: altaId },
    data: {
      estado: "PROCESADA",
      perfil_id: perfilId,
      procesada_at: new Date(),
      procesada_por: admin.id,
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "ALTA_USUARIO_PROCESADA",
    entidad: "alta_usuario",
    entidad_id: altaId,
    detalle: { nombre: alta.nombre, telefono: alta.telefono, perfil_id: perfilId },
  });

  revalidatePath("/admin/solicitudes-alta");
  return { ok: true };
}

export async function rechazarAltaUsuario(
  prevState: AltaActionResult,
  formData: FormData
): Promise<AltaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const altaId = (formData.get("altaId") as string)?.trim();
  if (!altaId) return { errores: ["ID de solicitud inválido."] };

  const alta = await prisma.altaUsuario.findUnique({ where: { id: altaId } });
  if (!alta) return { errores: ["Solicitud no encontrada."] };
  if (alta.estado !== "PENDIENTE") {
    return { errores: ["Esta solicitud ya fue procesada o rechazada."] };
  }

  await prisma.altaUsuario.update({
    where: { id: altaId },
    data: { estado: "RECHAZADA" },
  });

  // Notify client
  const nombre = alta.nombre.split(" ")[0];
  enviarWhatsApp(
    alta.telefono,
    `Hola ${nombre}, revisamos tu solicitud y no encontramos una cuenta asociada a tu número. Contactanos al +543436575372 para más información.`
  ).catch(() => {});

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "ALTA_USUARIO_RECHAZADA",
    entidad: "alta_usuario",
    entidad_id: altaId,
    detalle: { nombre: alta.nombre, telefono: alta.telefono },
  });

  revalidatePath("/admin/solicitudes-alta");
  return { ok: true };
}

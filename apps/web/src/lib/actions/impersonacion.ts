"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin, getSesionReal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { UUID_RE } from "@/lib/constants/validation";
import {
  firmarTokenImpersonacion,
  verificarTokenImpersonacion,
  IMPERSONACION_COOKIE_NAME,
  IMPERSONACION_COOKIE_OPTIONS,
} from "@/lib/auth/impersonacion";

/**
 * Inicia la impersonación: el ADMIN pasa a ver el portal EXACTAMENTE como el
 * cliente (mismas páginas /portal/*, solo lectura — ver esImpersonacion() en
 * las Server Actions del portal). Setea la cookie firmada y redirige.
 */
export async function iniciarImpersonacion(perfilId: string): Promise<never> {
  const admin = await requireAdmin();

  if (!UUID_RE.test(perfilId)) redirect("/admin/clientes");

  const cliente = await prisma.perfil.findUnique({
    where: { id: perfilId },
    select: { id: true, rol: true, nombre: true },
  });
  if (!cliente || cliente.rol !== "CLIENTE") redirect("/admin/clientes");

  const token = firmarTokenImpersonacion({
    perfilId: cliente.id,
    adminId: admin.id,
    adminNombre: admin.nombre,
  });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONACION_COOKIE_NAME, token, IMPERSONACION_COOKIE_OPTIONS);

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "IMPERSONACION_INICIADA",
    entidad: "perfil",
    entidad_id: cliente.id,
    detalle: { nombre: cliente.nombre },
  });

  redirect("/portal/dashboard");
}

/**
 * Termina la impersonación: borra la cookie y vuelve al admin. Usa la sesión
 * REAL para la auditoría (el admin real, nunca el cliente impersonado).
 */
export async function terminarImpersonacion(): Promise<never> {
  const real = await getSesionReal();

  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONACION_COOKIE_NAME)?.value;
  const payload = token ? verificarTokenImpersonacion(token) : null;

  cookieStore.delete(IMPERSONACION_COOKIE_NAME);

  if (real && real.perfil.rol === "ADMIN") {
    await registrarAudit({
      admin_id: real.perfil.id,
      admin_nombre: real.perfil.nombre,
      accion: "IMPERSONACION_FINALIZADA",
      entidad: "perfil",
      entidad_id: payload?.perfilId ?? real.perfil.id,
    });
  }

  redirect(payload?.perfilId ? `/admin/clientes/${payload.perfilId}` : "/admin/clientes");
}

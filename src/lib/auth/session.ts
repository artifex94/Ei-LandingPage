import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { puedeAcceder, rutaInicio, type Rol } from "@/lib/auth/policy";

/**
 * Guards de sesión y rol — capa de SERVIDOR (server-only).
 *
 * Por qué importa: ni el middleware (proxy.ts) ni las RLS son la frontera
 * de autorización real de este sistema. Prisma se conecta con el rol del
 * pooler y el cliente admin de Supabase usa service_role: AMBOS ignoran las
 * RLS. Por lo tanto, la única frontera efectiva es el chequeo en código.
 * Estos guards son FAIL-CLOSED: ante la duda, deniegan (redirigen).
 */

export type Sesion = {
  userId: string;
  perfil: { id: string; rol: Rol; nombre: string; email: string | null };
};

/**
 * Resuelve la sesión actual SIN redirigir. Devuelve null si no hay usuario
 * autenticado o si no tiene perfil. Pensada para componer (la usa el wrapper
 * de acciones y los require* de abajo).
 */
export async function getSesion(): Promise<Sesion | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const perfil = await prisma.perfil.findUnique({
    where: { id: user.id },
    select: { id: true, rol: true, nombre: true, email: true },
  });
  if (!perfil) return null;

  return { userId: user.id, perfil: perfil as Sesion["perfil"] };
}

/** Exige sesión autenticada. Redirige a /login si no hay. */
export async function requireSesion(): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

/**
 * Exige que el usuario tenga uno de los roles permitidos. FAIL-CLOSED:
 * si el rol no está habilitado, redirige a su área de aterrizaje (nunca
 * deja pasar). Pensada para páginas y layouts.
 */
export async function requireRol(...roles: Rol[]): Promise<Sesion> {
  const sesion = await requireSesion();
  if (!puedeAcceder(sesion.perfil.rol, roles)) {
    redirect(rutaInicio(sesion.perfil.rol));
  }
  return sesion;
}

/**
 * Exige rol ADMIN. FAIL-CLOSED: si no es admin, redirige.
 * Retorna { id, nombre, email } del perfil autenticado.
 */
export async function requireAdmin(): Promise<{ id: string; nombre: string; email: string | null }> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "ADMIN") redirect(rutaInicio(sesion.perfil.rol));
  return { id: sesion.perfil.id, nombre: sesion.perfil.nombre, email: sesion.perfil.email };
}

/** Variante liviana de requireAdmin para auditoría (id + nombre). FAIL-CLOSED. */
export async function requireAdminWithName(): Promise<{ id: string; nombre: string }> {
  const sesion = await requireSesion();
  if (sesion.perfil.rol !== "ADMIN") {
    redirect(rutaInicio(sesion.perfil.rol));
  }
  return { id: sesion.perfil.id, nombre: sesion.perfil.nombre };
}

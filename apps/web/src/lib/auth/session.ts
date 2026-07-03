import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { puedeAcceder, rutaInicio, type Rol } from "@/lib/auth/policy";
import {
  IMPERSONACION_COOKIE_NAME,
  verificarTokenImpersonacion,
  type PayloadImpersonacion,
} from "@/lib/auth/impersonacion";

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
  /** Presente solo cuando un ADMIN está viendo el portal como un cliente (solo lectura). */
  impersonacion?: { adminId: string; adminNombre: string };
};

/**
 * Resuelve la sesión REAL (autenticada por Supabase) SIN redirigir y SIN
 * considerar impersonación. Devuelve null si no hay usuario autenticado o si
 * no tiene perfil.
 *
 * Usar esta variante (en vez de `getSesion`) en TODO lo que sea área admin o
 * de empleados (accionAdmin/accionConRol, requireAdmin, requireCapacidad,
 * /monitoreo, /api/admin/*): esas superficies NUNCA deben resolver la
 * identidad impersonada, aunque el admin tenga la cookie de impersonación
 * activa en otra pestaña — así puede tener /admin y /portal abiertos a la vez
 * sin que sus propias acciones administrativas se vean bloqueadas.
 */
export const getSesionReal = cache(async (): Promise<Sesion | null> => {
  // React.cache: UNA resolución por request. Sin esto, layout + página +
  // componentes anidados repetían el roundtrip a la Auth API de Supabase
  // (~200-300ms cada uno) y la query de perfil — medido como la mayor parte
  // del TTFB >1s de los dashboards en producción.
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
});

/**
 * Decide si corresponde aplicar la impersonación en curso. Función PURA —
 * extraída de `getSesion()` para poder testearla sin Prisma/cookies.
 *
 * Chequea, en orden:
 *   1. Que el token pertenezca AL MISMO admin real que lo está presentando
 *      (`payload.adminId === realPerfil.id`). Sin esto, un admin que roba o
 *      hereda la cookie `ei_impersonar` de otro admin (ej. sesión compartida,
 *      dispositivo compartido) hereda su impersonación activa.
 *   2. Que el token no haya expirado (`payload.exp`), con el reloj inyectado
 *      por parámetro para que el test no dependa de Date.now().
 *   3. Que el target siga existiendo y siga siendo CLIENTE.
 */
export function debeAplicarImpersonacion(params: {
  realPerfil: { id: string };
  payload: PayloadImpersonacion;
  target: { rol: Rol } | null;
  ahora: number;
}): boolean {
  const { realPerfil, payload, target, ahora } = params;
  if (payload.adminId !== realPerfil.id) return false;
  if (payload.exp <= ahora) return false;
  if (!target || target.rol !== "CLIENTE") return false;
  return true;
}

/**
 * Resuelve la sesión actual SIN redirigir, considerando impersonación.
 *
 * Si el usuario real es ADMIN y trae una cookie `ei_impersonar` válida
 * (firma + expiración + mismo admin que la firmó) apuntando a un perfil
 * CLIENTE existente, devuelve la sesión DE ESE CLIENTE (con `impersonacion`
 * seteado). Cualquier problema con la cookie (ausente, inválida, vencida,
 * emitida para otro admin, o el target ya no es CLIENTE) hace que se
 * devuelva la sesión real sin tocar la cookie — los Server Components no
 * pueden setear/borrar cookies, así que la limpieza queda para
 * `terminarImpersonacion`.
 *
 * Pensada para el portal (`requireSesion`, páginas y Server Actions bajo
 * `/portal`). Para admin/empleados usar `getSesionReal`.
 */
export const getSesion = cache(async (): Promise<Sesion | null> => {
  const real = await getSesionReal();
  if (!real) return null;
  if (real.perfil.rol !== "ADMIN") return real;

  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONACION_COOKIE_NAME)?.value;
  if (!token) return real;

  const payload = verificarTokenImpersonacion(token);
  if (!payload) return real;

  const cliente = await prisma.perfil.findUnique({
    where: { id: payload.perfilId },
    select: { id: true, rol: true, nombre: true, email: true },
  });

  if (
    !cliente ||
    !debeAplicarImpersonacion({ realPerfil: real.perfil, payload, target: cliente, ahora: Date.now() })
  ) {
    return real;
  }

  return {
    userId: cliente.id,
    perfil: cliente as Sesion["perfil"],
    impersonacion: { adminId: payload.adminId, adminNombre: payload.adminNombre },
  };
});

/** Exige sesión autenticada (impersonation-aware). Redirige a /login si no hay. */
export async function requireSesion(): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

/**
 * Exige que el usuario tenga uno de los roles permitidos. FAIL-CLOSED:
 * si el rol no está habilitado, redirige a su área de aterrizaje (nunca
 * deja pasar). Pensada para páginas y layouts.
 *
 * Usa la sesión REAL a propósito: en este código base `requireRol` solo se
 * usa para gatear rutas/acciones exclusivas de ADMIN (importar, higienizar,
 * mantenimiento) — nunca para el portal (que usa `requireSesion` directo).
 * Si fuera impersonation-aware, un admin impersonando en otra pestaña vería
 * sus propias acciones de admin rechazadas por "rol CLIENTE".
 */
export async function requireRol(...roles: Rol[]): Promise<Sesion> {
  const sesion = await getSesionReal();
  if (!sesion) redirect("/login");
  if (!puedeAcceder(sesion.perfil.rol, roles)) {
    redirect(rutaInicio(sesion.perfil.rol));
  }
  return sesion;
}

/**
 * Exige rol ADMIN. FAIL-CLOSED: si no es admin, redirige.
 * Retorna { id, nombre, email } del perfil autenticado.
 *
 * Usa la sesión REAL: el área admin nunca debe ver la identidad impersonada.
 */
export async function requireAdmin(): Promise<{ id: string; nombre: string; email: string | null }> {
  const sesion = await getSesionReal();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "ADMIN") redirect(rutaInicio(sesion.perfil.rol));
  return { id: sesion.perfil.id, nombre: sesion.perfil.nombre, email: sesion.perfil.email };
}

/**
 * Variante liviana de requireAdmin para auditoría (id + nombre). FAIL-CLOSED.
 * Usa la sesión REAL — mismo motivo que `requireAdmin`.
 */
export async function requireAdminWithName(): Promise<{ id: string; nombre: string }> {
  const sesion = await getSesionReal();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "ADMIN") {
    redirect(rutaInicio(sesion.perfil.rol));
  }
  return { id: sesion.perfil.id, nombre: sesion.perfil.nombre };
}

/** Capacidades de empleado que habilitan acciones específicas (tabla Empleado). */
export type Capacidad = "puede_monitorear" | "puede_facturar" | "puede_instalar";

/**
 * Exige ADMIN o que el empleado autenticado tenga AL MENOS UNA de las
 * capacidades dadas. FAIL-CLOSED: si no califica, redirige a su área.
 *
 * Pensada para Server Actions que antes eran solo-ADMIN y ahora también debe
 * poder ejecutar el agente con el flag correspondiente (Monitoreo, Cobros).
 * ADMIN nunca pierde acceso: este guard SOLO suma el camino por capacidad.
 * Retorna { id, nombre, email } del actor — drop-in de requireAdmin /
 * requireAdminWithName para la auditoría.
 *
 * Usa la sesión REAL: estas Server Actions son de admin/empleados, nunca del
 * portal — no deben ver la identidad impersonada.
 */
export async function requireCapacidad(
  ...capacidades: Capacidad[]
): Promise<{ id: string; nombre: string; email: string | null }> {
  const sesion = await getSesionReal();
  if (!sesion) redirect("/login");
  const actor = {
    id: sesion.perfil.id,
    nombre: sesion.perfil.nombre,
    email: sesion.perfil.email,
  };
  if (sesion.perfil.rol === "ADMIN") return actor;

  const empleado = await prisma.empleado.findFirst({
    where: { perfil_id: sesion.userId },
    select: { puede_monitorear: true, puede_facturar: true, puede_instalar: true },
  });
  const habilitado =
    empleado != null && capacidades.some((c) => empleado[c] === true);
  if (!habilitado) redirect(rutaInicio(sesion.perfil.rol));
  return actor;
}

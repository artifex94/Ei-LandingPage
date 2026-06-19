/**
 * Política de autorización — lógica PURA, sin dependencias de framework ni DB.
 *
 * Vive aparte de los guards de sesión a propósito: al no tocar Supabase,
 * Prisma ni cookies, se puede testear de forma unitaria y exhaustiva
 * (ver tests/auth.spec.ts). Es la fuente de verdad para "qué rol puede
 * acceder a qué" y "a dónde mandar a cada rol".
 */

export type Rol = "CLIENTE" | "ADMIN" | "TECNICO";

/**
 * Ruta de aterrizaje por rol. Centraliza lo que antes estaba duplicado
 * en proxy.ts y admin/layout.tsx. Si mañana cambia el home de un rol,
 * se cambia acá una sola vez.
 */
export const RUTA_INICIO_POR_ROL: Record<Rol, string> = {
  ADMIN: "/admin/dashboard",
  TECNICO: "/tecnico/mi-dia",
  CLIENTE: "/portal/dashboard",
};

/**
 * Decisión de autorización por rol. FAIL-CLOSED por diseño: cualquier rol
 * ausente (null/undefined) o no incluido en `permitidos` deniega el acceso.
 *
 * @param rol        rol del usuario autenticado (o null/undefined si no se pudo resolver)
 * @param permitidos roles habilitados para la operación
 */
export function puedeAcceder(
  rol: Rol | null | undefined,
  permitidos: readonly Rol[],
): boolean {
  if (!rol) return false;
  return permitidos.includes(rol);
}

/** Ruta de inicio segura para un rol; cae en /login si el rol es desconocido. */
export function rutaInicio(rol: Rol | null | undefined): string {
  if (!rol) return "/login";
  return RUTA_INICIO_POR_ROL[rol] ?? "/login";
}

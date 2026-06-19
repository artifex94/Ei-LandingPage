import "server-only";

/**
 * Punto de entrada retrocompatible de los guards de autorización.
 *
 * La implementación vive en `@/lib/auth/*` (política pura + guards de sesión
 * + wrappers para Server Actions). Este archivo se mantiene para no romper
 * los imports existentes (`@/lib/actions/auth`).
 *
 * Para código nuevo, preferí importar directamente desde:
 *   - `@/lib/auth/session` → requireRol / requireSesion / requireAdmin
 *   - `@/lib/auth/guard`   → accionAdmin / accionConRol (Server Actions)
 */
export {
  getSesion,
  requireSesion,
  requireRol,
  requireAdmin,
  requireAdminWithName,
  type Sesion,
} from "@/lib/auth/session";

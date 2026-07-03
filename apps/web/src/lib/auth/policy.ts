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

// ── Áreas operativas por capacidad (flags de Empleado) ──────────────────────
//
// Los "Agentes" (Monitoreo, Cobros, Servicio Técnico) no son roles nuevos:
// son empleados internos (rol TECNICO) diferenciados por sus flags `puede_*`.
// Cada flag desbloquea un área enfocada. ADMIN entra a todas.
export const RUTA_MONITOREO = "/monitoreo";
export const RUTA_COBROS = "/cobros";

/** Capacidades de un empleado, tal como viven en la tabla `Empleado`. */
export type FlagsEmpleado = {
  puede_monitorear?: boolean | null;
  puede_facturar?: boolean | null;
  puede_instalar?: boolean | null;
};

/**
 * Ruta de aterrizaje post-login considerando las capacidades del empleado.
 * Prioridad cuando hay varios flags: monitoreo → cobros → técnico. ADMIN
 * siempre va a su dashboard; sin flags ni rol de empleado cae al portal.
 * Lógica PURA: recibe los flags ya leídos de la DB (no toca Prisma).
 */
export function rutaInicioEmpleado(
  rol: Rol | null | undefined,
  flags?: FlagsEmpleado | null,
): string {
  if (!rol) return "/login";
  if (rol === "ADMIN") return RUTA_INICIO_POR_ROL.ADMIN;
  if (flags?.puede_monitorear) return RUTA_MONITOREO;
  if (flags?.puede_facturar) return RUTA_COBROS;
  if (rol === "TECNICO" || flags?.puede_instalar) return RUTA_INICIO_POR_ROL.TECNICO;
  return RUTA_INICIO_POR_ROL.CLIENTE;
}

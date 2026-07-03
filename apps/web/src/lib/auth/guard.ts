import "server-only";

import { redirect } from "next/navigation";
import { getSesionReal } from "@/lib/auth/session";
import { puedeAcceder, type Rol } from "@/lib/auth/policy";

/**
 * Wrappers de autorización para Server Actions.
 *
 * Objetivo: que sea IMPOSIBLE escribir un Server Action sin autorizarlo.
 * En vez de repetir el preámbulo `getUser + perfil + check` (y arriesgarse
 * a olvidar el chequeo, o a usar la variante fail-open), se envuelve el
 * handler: la autorización es parte de la estructura, no del cuerpo.
 *
 * Contrato preservado: ante un rol no autorizado se devuelve
 * `{ error: string }`, compatible con el patrón `useActionState` que ya usa
 * el proyecto. Ante falta de sesión se redirige a /login (NEXT_REDIRECT se
 * propaga y lo maneja Next).
 *
 * Uso:
 *   export const eliminarCliente = accionAdmin(async (ctx, formData) => {
 *     // ctx.id / ctx.nombre disponibles para auditoría; ya es admin acá.
 *     ...
 *     return { ok: true };
 *   });
 */

/** Contexto inyectado al handler una vez superada la autorización. */
export type CtxAccion = { id: string; nombre: string; rol: Rol };

const SIN_PERMISO: { error: string } = { error: "No tenés permisos para esta acción." };

/**
 * Envuelve un Server Action exigiendo uno de los `roles`. FAIL-CLOSED.
 * El handler solo se ejecuta si el usuario está autenticado y autorizado.
 */
export function accionConRol<A extends unknown[], R>(
  roles: readonly Rol[],
  handler: (ctx: CtxAccion, ...args: A) => Promise<R>,
): (...args: A) => Promise<R | typeof SIN_PERMISO> {
  return async (...args: A) => {
    const sesion = await getSesionReal();
    if (!sesion) redirect("/login");
    if (!puedeAcceder(sesion.perfil.rol, roles)) {
      return SIN_PERMISO;
    }
    const ctx: CtxAccion = {
      id: sesion.perfil.id,
      nombre: sesion.perfil.nombre,
      rol: sesion.perfil.rol,
    };
    return handler(ctx, ...args);
  };
}

/** Atajo: envuelve un Server Action exigiendo rol ADMIN. FAIL-CLOSED. */
export function accionAdmin<A extends unknown[], R>(
  handler: (ctx: CtxAccion, ...args: A) => Promise<R>,
): (...args: A) => Promise<R | typeof SIN_PERMISO> {
  return accionConRol(["ADMIN"], handler);
}

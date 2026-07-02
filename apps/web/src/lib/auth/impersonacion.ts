import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token firmado de impersonación — permite que un ADMIN vea el portal
 * EXACTAMENTE como un cliente (mismas páginas /portal/*, solo lectura).
 *
 * Diseño: HMAC-SHA256 sobre un payload base64url, sin dependencias nuevas
 * ni tabla en DB (el token es autocontenido y expira solo — TTL corto).
 *
 * Derivación de la clave: NO usamos SUPABASE_SERVICE_ROLE_KEY directo como
 * clave HMAC. La pasamos primero por SHA-256 con un prefijo propio
 * ("ei-impersonacion|") para obtener una clave derivada de uso exclusivo de
 * esta feature. Así, si el token o la clave derivada llegaran a filtrarse
 * (logs, error tracking, etc.), NO exponen material reutilizable contra
 * Supabase — es un secreto de un solo propósito, no la service_role key.
 */

const COOKIE_NAME = "ei_impersonar";
const TTL_MS = 45 * 60 * 1000; // 45 minutos

export interface PayloadImpersonacion {
  perfilId: string;
  adminId: string;
  adminNombre: string;
  exp: number; // epoch ms
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string | null {
  try {
    return Buffer.from(input, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/** Deriva la clave HMAC a partir del secret crudo. Función pura — ver rationale arriba. */
export function derivarSecretImpersonacion(secretCrudo: string): Buffer {
  return createHash("sha256").update(`ei-impersonacion|${secretCrudo}`).digest();
}

/**
 * Firma un payload de impersonación. Función PURA — el secret entra por
 * parámetro para poder testearla sin variables de entorno.
 */
export function firmarTokenImpersonacionPuro(
  payload: PayloadImpersonacion,
  secretDerivado: Buffer,
): string {
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const firma = createHmac("sha256", secretDerivado).update(payloadB64).digest("base64url");
  return `${payloadB64}.${firma}`;
}

/**
 * Verifica un token de impersonación. Función PURA — devuelve el payload si
 * la firma es válida Y no expiró; null en cualquier otro caso (formato
 * inválido, firma adulterada, o vencida). Comparación de firma con
 * timingSafeEqual para evitar timing attacks.
 */
export function verificarTokenImpersonacionPuro(
  token: string,
  secretDerivado: Buffer,
): PayloadImpersonacion | null {
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [payloadB64, firmaRecibida] = partes;
  if (!payloadB64 || !firmaRecibida) return null;

  const firmaEsperada = createHmac("sha256", secretDerivado).update(payloadB64).digest("base64url");

  const firmaEsperadaBuf = Buffer.from(firmaEsperada, "utf8");
  const firmaRecibidaBuf = Buffer.from(firmaRecibida, "utf8");
  if (firmaEsperadaBuf.length !== firmaRecibidaBuf.length) return null;

  let firmaValida: boolean;
  try {
    firmaValida = timingSafeEqual(firmaEsperadaBuf, firmaRecibidaBuf);
  } catch {
    return null;
  }
  if (!firmaValida) return null;

  const payloadJson = base64UrlDecode(payloadB64);
  if (!payloadJson) return null;

  let payload: PayloadImpersonacion;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  if (
    typeof payload.perfilId !== "string" ||
    typeof payload.adminId !== "string" ||
    typeof payload.adminNombre !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (Date.now() >= payload.exp) return null;

  return payload;
}

// ─── Wrappers server-only (leen el secret de env) ────────────────────────────

function secretDesdeEnv(): Buffer {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada.");
  return derivarSecretImpersonacion(raw);
}

export function firmarTokenImpersonacion(params: {
  perfilId: string;
  adminId: string;
  adminNombre: string;
}): string {
  const payload: PayloadImpersonacion = {
    ...params,
    exp: Date.now() + TTL_MS,
  };
  return firmarTokenImpersonacionPuro(payload, secretDesdeEnv());
}

export function verificarTokenImpersonacion(token: string): PayloadImpersonacion | null {
  try {
    return verificarTokenImpersonacionPuro(token, secretDesdeEnv());
  } catch {
    return null;
  }
}

// ─── Cookie ───────────────────────────────────────────────────────────────────

export const IMPERSONACION_COOKIE_NAME = COOKIE_NAME;
export const IMPERSONACION_TTL_MS = TTL_MS;

export const IMPERSONACION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: Math.floor(TTL_MS / 1000),
};

/**
 * Núcleo del anti-corruption layer sobre la suite web de SoftGuard (:8080).
 *
 * Este archivo es la ÚNICA pieza que conoce el dialecto de transporte de la
 * suite: login OAuth por cookies, header X-Requested-With, formato de listas
 * ExtJS {success,total,rows} y las rarezas de sus datos (fechas US/ISO,
 * padding de espacios, sentinel 1/1/1900). Los adaptadores por módulo
 * (monitoreo.ts, crm.ts, sistema.ts, …) consumen `restGet` y los helpers de
 * normalización, y exponen tipos limpios del dominio del portal.
 *
 * ── Flujo de login ────────────────────────────────────────────────────────────
 * GET  /                  → cookie ASP.NET_SessionId
 * POST /OAuthLogin.ashx   (username, password, ClientId, cDealer) → 302 con
 *                         Location=/OAuthCallback.ashx?...&Code=XXX (sin reCAPTCHA)
 * GET  <callback>         → Set-Cookie: OAuth_Token (bearer de sesión, ~30 min)
 * Auth por request: cookie OAuth_Token + X-Requested-With: XMLHttpRequest
 *
 * ── Config (env) ──────────────────────────────────────────────────────────────
 * SOFTGUARD_API_BASE       http://<host>:8080
 * SOFTGUARD_API_USER       usuario de la suite web
 * SOFTGUARD_API_PASS       clave
 * SOFTGUARD_API_CLIENT_ID  GUID del cliente (campo oculto ClientId del login)
 * SOFTGUARD_API_TIMEOUT_MS opcional (default 15000)
 *
 * REGLA DEL PRODUCTO: SOLO LECTURA. Ningún adaptador escribe contra SoftGuard;
 * el procesamiento de eventos y la gestión se hacen en la suite hasta nuevo aviso.
 */

// ── Configuración ──────────────────────────────────────────────────────────────

export interface WebApiConfig {
  base: string;
  user: string;
  pass: string;
  clientId: string;
  timeoutMs: number;
}

export function readConfig(): WebApiConfig {
  return {
    base:      (process.env.SOFTGUARD_API_BASE ?? "").replace(/\/$/, ""),
    user:       process.env.SOFTGUARD_API_USER ?? "",
    pass:       process.env.SOFTGUARD_API_PASS ?? "",
    clientId:   process.env.SOFTGUARD_API_CLIENT_ID ?? "",
    timeoutMs:  parseInt(process.env.SOFTGUARD_API_TIMEOUT_MS ?? "15000", 10),
  };
}

/** true cuando hay base + usuario + clave. Mientras sea false, no usar el adaptador. */
export function softguardWebApiConfigured(): boolean {
  const c = readConfig();
  return Boolean(c.base && c.user && c.pass);
}

/**
 * Descarta la sesión cacheada → el próximo request hace login fresco.
 * Usar para reconexión manual tras mantenimientos/microcortes de la central.
 */
export function invalidateWebApiSession(): void {
  globalForSgApi._sgApiCookie = undefined;
}

// ── Sesión (cookie OAuth_Token cacheada en el proceso) ───────────────────────────

const globalForSgApi = globalThis as unknown as {
  _sgApiCookie: { value: string; expiresAt: number } | undefined;
};

export function withTimeout(timeoutMs: number): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

function parseSetCookie(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  // getSetCookie() (Node 18.14+) devuelve cada Set-Cookie por separado.
  const raw = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
    ?? (headers.get("set-cookie") ? [headers.get("set-cookie") as string] : []);
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Hace el flujo de login completo y devuelve el header Cookie a usar en cada request.
 * Cachea la cookie ~25 min (la sesión ASP.NET suele durar 30).
 */
export async function getSessionCookie(c: WebApiConfig): Promise<string> {
  const cached = globalForSgApi._sgApiCookie;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const cookies: Record<string, string> = {};
  const cookieHeader = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");

  // 1. GET / → ASP.NET_SessionId
  {
    const { signal, done } = withTimeout(c.timeoutMs);
    try {
      const res = await fetch(`${c.base}/`, { signal, redirect: "manual" });
      Object.assign(cookies, parseSetCookie(res.headers));
    } finally { done(); }
  }

  // 2. POST /OAuthLogin.ashx → 302 con Location (?Code=...)
  let callbackPath = "";
  {
    const { signal, done } = withTimeout(c.timeoutMs);
    try {
      const body = new URLSearchParams({
        username: c.user, password: c.pass, ClientId: c.clientId, cDealer: "",
      });
      const res = await fetch(`${c.base}/OAuthLogin.ashx`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader() },
        body,
        redirect: "manual",
        signal,
      });
      Object.assign(cookies, parseSetCookie(res.headers));
      const loc = res.headers.get("location") ?? "";
      if (!loc) throw new Error("login sin redirect — credenciales inválidas o reCAPTCHA");
      callbackPath = loc.startsWith("http") ? loc : `${c.base}${loc}`;
    } finally { done(); }
  }

  // 3. GET callback → Set-Cookie: OAuth_Token
  {
    const { signal, done } = withTimeout(c.timeoutMs);
    try {
      const res = await fetch(callbackPath, {
        headers: { Cookie: cookieHeader() },
        redirect: "manual",
        signal,
      });
      Object.assign(cookies, parseSetCookie(res.headers));
    } finally { done(); }
  }

  if (!cookies.OAuth_Token) throw new Error("no se obtuvo OAuth_Token tras el login");

  const value = cookieHeader();
  globalForSgApi._sgApiCookie = { value, expiresAt: Date.now() + 25 * 60_000 };
  return value;
}

// ── Cliente REST ─────────────────────────────────────────────────────────────────

export interface RestList<T> { success: boolean; total: number; rows: T[] }

/**
 * GET autenticado con auto-recuperación: si la sesión se cayó (HTTP de error
 * o respuesta no-JSON — típico tras mantenimientos/microcortes de la central),
 * invalida la cookie cacheada y reintenta UNA vez con login fresco.
 */
export async function restGet<T>(
  c: WebApiConfig,
  path: string,
  params: Record<string, string | number> = {},
  esReintento = false,
): Promise<RestList<T>> {
  const cookie = await getSessionCookie(c);
  const qs = new URLSearchParams({ _dc: String(Date.now()), ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const { signal, done } = withTimeout(c.timeoutMs);
  let sesionCaida: string;
  try {
    const res = await fetch(`${c.base}${path}?${qs}`, {
      headers: { Cookie: cookie, "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
      signal,
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && ct.includes("json")) {
      return (await res.json()) as RestList<T>;
    }
    sesionCaida = res.ok ? "respuesta no-JSON (sesión expirada?)" : `HTTP ${res.status}`;
  } finally { done(); }

  globalForSgApi._sgApiCookie = undefined;
  if (!esReintento) return restGet<T>(c, path, params, true);
  throw new Error(`SoftGuard API GET ${path} → ${sesionCaida}`);
}

// ── Normalización (las rarezas de los datos de SoftGuard) ───────────────────────

/** String con trim; null/undefined → "". SoftGuard rellena con espacios ("0175      "). */
export function s(v: unknown): string { return v == null ? "" : String(v).trim(); }

export function num(v: unknown): number | null { const x = Number(v); return Number.isFinite(x) ? x : null; }

/**
 * Ref de cuenta en el formato del portal: "ESI-0175" (linea-cuenta).
 * SoftGuard devuelve linea y número por separado (con padding de espacios).
 */
export function refCuenta(linea: unknown, ncuenta: unknown): string {
  const l = s(linea);
  const n = s(ncuenta);
  return l ? `${l}-${n}` : n;
}

/**
 * Fechas de SoftGuard: ISO ("2026-06-10T18:21:00") o US ("8/27/2009 1:01:41 PM").
 * Vacío, inválida o el sentinel 1/1/1900 ("sin dato") → null.
 */
export function fecha(v: unknown): Date | null {
  const str = s(v);
  if (!str) return null;
  const d = new Date(str);
  if (!Number.isFinite(d.getTime()) || d.getFullYear() < 1950) return null;
  return d;
}

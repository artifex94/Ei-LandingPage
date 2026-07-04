import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Rate Limiter en memoria ──────────────────────────────────────────────────
//
// Protege los endpoints de autenticación contra:
//  - Fuerza bruta de DNI/contraseña
//  - Spam de magic links por email (costo de OTP)
//  - Spam de mensajes WhatsApp a través de Twilio (costo real)
//
// Implementación: ventana deslizante de 60 segundos por IP.
// Límite: 10 intentos POST por IP por minuto en /login.
// Adecuado para despliegue single-instance en Hostinger.

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const loginRateLimit = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const RATE_LIMIT_MAX_LOGIN = 10;     // 10 intentos POST/min por IP

// Limpieza periódica para evitar crecimiento indefinido del Map.
// Se ejecuta al procesar cada 200 requests con ventanas expiradas.
let requestCount = 0;
function limpiarEntradasViejas() {
  requestCount++;
  if (requestCount % 200 !== 0) return;
  const ahora = Date.now();
  for (const [ip, entry] of loginRateLimit) {
    if (ahora - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      loginRateLimit.delete(ip);
    }
  }
}

function verificarRateLimit(ip: string, max: number): boolean {
  const ahora = Date.now();
  const entry = loginRateLimit.get(ip);

  if (!entry || ahora - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginRateLimit.set(ip, { count: 1, windowStart: ahora });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

function obtenerIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── Prefetch del rol ─────────────────────────────────────────────────────────
//
// El middleware necesita dos datos remotos: el usuario verificado
// (`auth.getUser()`, ~95 ms) y su rol (`perfiles.rol`, ~90 ms). En serie son
// ~185 ms fijos por navegación. Para paralelizarlos, el `sub` del access token
// se lee del cookie SIN verificar firma — sirve únicamente como hint para
// disparar la query de rol en paralelo. La decisión de autenticación sigue
// siendo 100 % de `getUser()`: el rol prefetcheado solo se usa si
// `user.id === sub` (si no coincide, o el token estaba vencido, se re-consulta
// por el camino secuencial de siempre). PostgREST además verifica el JWT por
// su cuenta al aplicar RLS, así que un token forjado devuelve error → null.

function accessTokenDelCookie(request: NextRequest): string | null {
  try {
    // El cookie de sesión puede venir entero (…-auth-token) o partido en
    // chunks (…-auth-token.0, .1, …) cuando supera el límite de tamaño.
    const piezas = request.cookies
      .getAll()
      .filter((c) => /-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    if (piezas.length === 0) return null;
    const crudo = decodeURIComponent(piezas.map((c) => c.value).join(""));
    const json = crudo.startsWith("base64-") ? atob(crudo.slice(7)) : crudo;
    const token: unknown = JSON.parse(json)?.access_token;
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

function subDelToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Query de rol vía PostgREST directo, sin tocar el estado del client SSR. */
async function prefetchRol(sub: string, accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/perfiles?id=eq.${sub}&select=rol`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!res.ok) return null;
    const filas: Array<{ rol?: string }> = await res.json();
    return filas[0]?.rol ?? null;
  } catch {
    return null;
  }
}

// ─── Middleware principal ─────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  limpiarEntradasViejas();

  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // ── CSP para rutas embed (DSS URL Launcher) ────────────────────────────────
  if (pathname.startsWith("/embed/")) {
    const res = NextResponse.next();
    const dssOrigin = process.env.SOFTGUARD_DSS_ORIGIN ?? "";
    res.headers.set(
      "Content-Security-Policy",
      `frame-ancestors 'self'${dssOrigin ? ` ${dssOrigin}` : ""}`
    );
    return res;
  }

  // ── Rate limiting en login (POST = Server Action calls) ────────────────────
  // Las Server Actions de login (/app/login/actions.ts) se invocan como POST
  // al mismo path /login.
  if (method === "POST" && pathname === "/login") {
    const ip = obtenerIp(request);
    if (!verificarRateLimit(ip, RATE_LIMIT_MAX_LOGIN)) {
      return new NextResponse(
        JSON.stringify({ error: "Demasiados intentos. Esperá un momento." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }
  }

  // ── Auth guards via Supabase ───────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Prefetch del rol en paralelo con getUser (ver bloque de arriba) ────────
  const necesitaRol = pathname.startsWith("/portal") || pathname.startsWith("/admin");
  let subHint: string | null = null;
  let rolPrefetch: Promise<string | null> | null = null;
  if (necesitaRol) {
    const token = accessTokenDelCookie(request);
    subHint = token ? subDelToken(token) : null;
    if (token && subHint) rolPrefetch = prefetchRol(subHint, token);
  }

  // Refrescar sesión — no borrar esta llamada
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Rutas protegidas: requieren sesión ────────────────────────────────────
  const esRutaProtegida =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/tecnico") ||
    pathname.startsWith("/monitoreo") ||
    pathname.startsWith("/cobros") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/recibo");

  if (esRutaProtegida && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Fetch de rol — una sola query para portal y admin ─────────────────────
  // Camino rápido: el prefetch paralelo, solo si el sub del token coincide con
  // el usuario verificado. Camino lento (token vencido/rotado, sub distinto o
  // prefetch fallido): la query secuencial de siempre con el user verificado.
  let rolUsuario: string | null = null;
  if (user && necesitaRol) {
    if (rolPrefetch && subHint === user.id) {
      rolUsuario = await rolPrefetch;
    }
    if (rolUsuario === null) {
      const { data } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();
      rolUsuario = data?.rol ?? null;
    }
  }

  // ── Guard portal — exclusivo para CLIENTE ─────────────────────────────────
  // ADMIN y TECNICO tienen sus propias áreas; no deben ver el portal de cliente.
  //
  // Excepción: impersonación (ver src/lib/auth/impersonacion.ts). Un ADMIN con
  // la cookie "ei_impersonar" presente puede entrar a /portal — acá solo se
  // chequea PRESENCIA (no firma ni expiración: node:crypto/Prisma no corren
  // en este runtime de middleware). La verificación real (HMAC + exp + que el
  // target siga siendo CLIENTE) la hace `getSesion()` server-side; si la
  // cookie es inválida, `getSesion()` devuelve la sesión real (ADMIN) y la
  // "segunda línea de defensa" en portal/layout.tsx redirige igual. Fail-closed
  // preservado: una cookie forjada nunca deja pasar más allá de esa segunda
  // línea.
  if (pathname.startsWith("/portal")) {
    if (rolUsuario === "ADMIN") {
      const posibleImpersonacion = request.cookies.has("ei_impersonar");
      if (!posibleImpersonacion) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
    if (rolUsuario === "TECNICO") {
      return NextResponse.redirect(new URL("/tecnico/mi-dia", request.url));
    }
  }

  // ── Guard admin — requiere rol ADMIN ──────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (rolUsuario !== "ADMIN") {
      // Cada rol tiene su área de aterrizaje; no redirigir al portal de cliente
      const destino = rolUsuario === "TECNICO" ? "/tecnico/mi-dia" : "/portal/dashboard";
      return NextResponse.redirect(new URL(destino, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};

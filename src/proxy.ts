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

  // Refrescar sesión — no borrar esta llamada
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Rutas protegidas: requieren sesión ────────────────────────────────────
  const esRutaProtegida =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/tecnico") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/recibo");

  if (esRutaProtegida && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Fetch de rol — una sola query para portal y admin ─────────────────────
  // Solo se ejecuta cuando el usuario está autenticado y accede a rutas
  // que requieren separación por rol.
  let rolUsuario: string | null = null;
  if (user && (pathname.startsWith("/portal") || pathname.startsWith("/admin"))) {
    const { data } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();
    rolUsuario = data?.rol ?? null;
  }

  // ── Guard portal — exclusivo para CLIENTE ─────────────────────────────────
  // ADMIN y TECNICO tienen sus propias áreas; no deben ver el portal de cliente.
  if (pathname.startsWith("/portal")) {
    if (rolUsuario === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
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

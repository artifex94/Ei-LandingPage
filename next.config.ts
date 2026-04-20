import type { NextConfig } from "next";

// Cabeceras de seguridad HTTP aplicadas a todas las rutas
const securityHeaders = [
  // Fuerza HTTPS — 2 años, incluye subdominios
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Impide que el browser "olfatee" el MIME type del contenido
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Prohíbe que el portal sea embebido en iframes (clickjacking)
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Controla cuánto referer se envía a terceros
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Desactiva APIs del browser no utilizadas
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content Security Policy
  // script-src incluye unsafe-inline/unsafe-eval porque Next.js App Router
  // inyecta scripts de hidratación inline. El resto de directivas protegen
  // contra inyección de iframes, plugins, formularios externos y recursos
  // de orígenes no autorizados.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js necesita unsafe-inline + unsafe-eval para hidratación del cliente
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind genera estilos inline
      "style-src 'self' 'unsafe-inline'",
      // Imágenes: propio dominio, datos en base64, blobs, HTTPS externo
      "img-src 'self' data: blob: https:",
      // Inter via next/font se auto-hospeda en 'self'
      "font-src 'self'",
      // Conexiones JS: propio dominio + Supabase (auth + realtime)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      // Sin iframes embebidos
      "frame-src 'none'",
      // Este sitio no puede ser embebido en iframes de otros dominios
      "frame-ancestors 'none'",
      // Sin plugins Flash/Java/PDF
      "object-src 'none'",
      // Previene inyección de base tag
      "base-uri 'self'",
      // Los forms solo pueden enviar al propio dominio
      "form-action 'self'",
      // Fuerza HTTPS para todos los sub-recursos
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

// Headers para rutas /embed/* — usadas por URL Launcher de SoftGuard DSS (Fase 4).
// Relajan frame-ancestors para permitir que el DSS embeba el portal en un iframe.
// SOFTGUARD_DSS_HOST debe ser la IP/hostname del servidor SoftGuard (ej: "192.168.1.10").
const embedHeaders = [
  // Permitir iframes desde el DSS de SoftGuard (y self)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      // Se sobreescribe per-request desde middleware con la IP real del DSS
      `frame-ancestors 'self' http://${process.env.SOFTGUARD_DSS_HOST ?? "localhost"}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // Overrides específicos para embed — quitar DENY que bloquearía el iframe
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  experimental: {
    serverActions: {
      // 10MB para permitir uploads de CSV/XLS en admin.
      // Los endpoints de login son un subset de Server Actions; el rate
      // limiting en middleware mitiga el abuso de uploads grandes en login.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        // Rutas de embed para URL Launcher de SoftGuard DSS (Fase 4)
        source: "/embed/(.*)",
        headers: embedHeaders,
      },
      {
        // Aplica a todas las demás rutas
        source: "/((?!embed).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

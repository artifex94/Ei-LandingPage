# Escobar Instalaciones — Monorepo

Monorepo único de la plataforma de Escobar Instalaciones (ERP + portales + sitio).
Repositorio unificado: historial completo en un solo `.git`.

## Estructura

```
.
├── apps/
│   ├── web/            # App principal Next.js 16 (ERP admin + portal cliente + técnico + landing)
│   └── alta-usuario/   # Landing estática de onboarding (index.html) — deploy aparte
├── infra/
│   ├── database/       # Esquema SQL, dumps y políticas RLS
│   └── deploy/         # Artefactos y config de despliegue (ZIPs ignorados por git)
├── docs/               # Planes (general/frontend/backend) e integración SoftGuard
├── recursos/           # Manuales SoftGuard, informes UX y referencias (PDFs ignorados)
├── scripts/            # Scripts a nivel repo (ej. make_source_zip.py)
├── .github/workflows/  # CI
└── AGENTS.md           # Órdenes permanentes (cron mensual, etc.)
```

## App principal (`apps/web`)

Stack: Next.js 16 · React 19 · Tailwind 4 · Radix · Prisma 7 · Supabase · MercadoPago.
Integra la suite **SoftGuard** mediante un anti-corruption layer (`src/lib/softguard/api/`)
en modo **solo lectura**.

```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000
npm run test:unit    # Vitest
npx tsc --noEmit     # typecheck
```

Variables de entorno en `apps/web/.env.local` (no versionado).

## Despliegue

Build-on-server en Hostinger: se sube un ZIP del código fuente (`scripts/make_source_zip.py`)
y el servidor compila. Detalle completo en `docs/DEPLOY-HOSTINGER.md`.

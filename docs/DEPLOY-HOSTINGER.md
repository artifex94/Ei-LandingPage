# Deploy a Hostinger — build-on-server

Guía de despliegue del portal (`apps/web`) en el VPS de Hostinger.

> **Modelo de deploy:** se sube el **código fuente** comprimido y **Hostinger compila**
> (`npm install && npm run build`). NO se sube un build previo. El flujo standalone
> anterior (`scripts/make_deploy_zip.py` zippeando `.next/standalone`) quedó **obsoleto**.

---

## 1. Generar el zip de fuente

Desde la raíz del repo:

```bash
python3 scripts/make_source_zip.py
```

Genera `infra/deploy/frontend/ei-source-<fecha>.zip`. Por debajo usa
`git archive HEAD:apps/web`, así el zip contiene **solo lo versionado de `apps/web`**,
con `package.json` en la raíz. Solo empaqueta lo **commiteado** (avisa si hay cambios sin
commitear). Equivalente manual:

```bash
git archive --format=zip -o /tmp/ei-source.zip HEAD:apps/web
```

---

## 2. Estructura que el zip DEBE tener

El zip se descomprime como **raíz de la app Node** en Hostinger. En la raíz deben quedar:

```
package.json          ← scripts (build/start) y dependencias
package-lock.json     ← install reproducible (npm ci)
next.config.ts        ← output standalone + tsconfigPath de build
tsconfig.json         ← type-check (CI)
tsconfig.build.json   ← type-check del build (excluye tests)
prisma/               ← schema.prisma + migrations
prisma.config.ts
public/               ← assets estáticos
src/                  ← código de la app
postcss.config.mjs, eslint.config.mjs, components.json, etc.
```

**NO debe incluir** (los genera/provee el servidor):

| Excluido | Por qué |
|---|---|
| `node_modules/` | lo instala `npm install` en el servidor |
| `.next/` | lo genera `npm run build` en el servidor |
| `.env`, `.env.*` | los secretos se cargan en el panel de Hostinger, nunca en el zip |
| `src/generated/prisma/` | lo regenera `prisma generate` (parte del build) |

`git archive` excluye todo esto automáticamente (no está versionado).

---

## 3. Configuración en Hostinger (hPanel → Node.js App)

1. **App root:** la carpeta donde descomprimiste el zip.
2. **Node version:** 20.x o superior.
3. **Variables de entorno:** cargar TODAS las necesarias **ANTES de compilar**
   (ver §4). Las `NEXT_PUBLIC_*` se hornean en el build; si faltan, el front sale roto.
4. **Build command:** `npm install && npm run build`
   (en producción podés usar `npm ci --omit=dev` — ver §5).
5. **Start command:** `npm start` (`next start`).
6. Reiniciar la app (en setups con Passenger: `touch tmp/restart.txt`).

---

## 4. Variables de entorno

La plantilla canónica es **`apps/web/.env.example`**. Dos categorías:

- **`[BUILD]`** — deben existir al compilar. Son las `NEXT_PUBLIC_*` (quedan embebidas en
  el bundle del cliente) y `SOFTGUARD_DSS_HOST` (se lee en `next.config.ts` para el CSP de
  `/embed/*`). Cambiarlas exige **re-buildear**.
- **`[RUNTIME]`** — se leen con la app corriendo: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  Mercado Pago, Talo, Twilio, SoftGuard API, `CRON_SECRET`, `ADMIN_EMAIL_DOMAIN`.

> **`DATABASE_URL` NO es necesaria en build-time.** Todas las páginas que consultan la base
> son dinámicas (ver §6), así que el build no se conecta a Postgres. Verificado: el build
> completa sin `DATABASE_URL`. Sí es obligatoria en runtime.

---

## 5. Por qué el build funciona aunque el host omita devDependencies

Hostinger suele instalar con `NODE_ENV=production` (o `npm ci --omit=dev`), que **omite
`devDependencies`**. Por eso las dependencias que el build necesita están en
`dependencies`, NO en `devDependencies`:

- `typescript`, `@types/node`, `@types/react`, `@types/react-dom` → type-check del build.
- `babel-plugin-react-compiler` → requerido por `reactCompiler: true`.

Los tests (`vitest`, `@playwright/test`, `@testing-library/*`, `jsdom`, `eslint`, …) quedan
en `devDependencies`. Para que el type-check del build no falle por archivos de test que
importan esas libs, `next build` usa **`tsconfig.build.json`** (vía `typescript.tsconfigPath`),
que excluye `*.test.*`, `vitest.setup.ts`, `playwright.config.ts` y `fixtures.ts`. CI sigue
type-chequeando TODO con `tsconfig.json`.

Notas de Next.js 16:
- `next build` **ya no corre ESLint** (se eliminó `next lint`). El lint vive en CI
  (`npm run lint`). Por eso `eslint` puede quedar en `devDependencies`.
- El type-check del build SÍ corre y aborta ante errores de tipos reales (a propósito).

---

## 6. Por qué el build no toca la base de datos

`next build` intenta prerenderizar páginas estáticas. Las rutas de `portal/`, `admin/` y
`tecnico/` llaman `requireSesion()` → `getSesion()` → `createClient()` → **`cookies()`**
ANTES de cualquier query Prisma. `cookies()` fuerza render dinámico, así que Next las marca
`ƒ (Dynamic)` y **no las ejecuta en build**. Las dos públicas que usan Prisma
(`recibo/[id]`, `embed/[softguard_ref]`) son segmentos dinámicos sin `generateStaticParams`
y usan `searchParams`/`params` → también dinámicas. Solo `/login`, `/solicitud-alta` e
iconos se prerenderizan, y esos no consultan la DB.

---

## 7. Checklist de deploy

1. `npm run lint && npx tsc --noEmit && npm run test:unit` en local (o confiar en CI verde).
2. Commitear los cambios a desplegar.
3. `python3 scripts/make_source_zip.py`.
4. Subir el zip a Hostinger y descomprimir como raíz de la app.
5. Confirmar variables de entorno cargadas en el panel (todas las de §4).
6. Build: `npm install && npm run build`. Start: `npm start`. Reiniciar.
7. Smoke test: landing, `/login`, `/portal`, `/admin`, un pago.

---

## 8. Consideraciones a futuro

- **Páginas nuevas que consulten la DB:** si una página/route consulta Prisma y NO usa
  `cookies()`/auth ni es segmento dinámico, podría intentar conectarse en build. Marcarla con
  `export const dynamic = "force-dynamic";` o garantizar `DATABASE_URL` en build-time.
- **Mantener las build-deps en `dependencies`:** si agregás algo que el build necesite
  (un plugin de Babel, tipos, etc.), va en `dependencies`, no en `devDependencies`.
- **Imports de dev-deps fuera de tests:** si un archivo no-test importa una `devDependency`
  (p. ej. un nuevo fixture con `vitest`), agregalo al `exclude` de `tsconfig.build.json` o
  moverlo a `tests/`. Si no, el type-check del build falla.
- **Memoria del VPS:** `next build` consume RAM; en planes chicos puede dar OOM. Alternativa
  de respaldo: buildear local y volver al flujo standalone (`make_deploy_zip.py` quedó como
  referencia).
- **`output: "standalone"`** queda inerte con `npm start` (`next start` sirve desde `.next`).
  Se conserva por compatibilidad y por si se vuelve al deploy de bundle.
- **Cambios en `SOFTGUARD_DSS_HOST`:** al hornearse en build (CSP de `/embed/*`), un cambio
  de IP/host del DSS requiere re-buildear.

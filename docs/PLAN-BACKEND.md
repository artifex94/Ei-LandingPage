# Plan de trabajo — Capa Backend / Infraestructura
## EscobarInstalaciones — Plataforma de Clientes

> **Nota arquitectónica:** No existe un backend separado. Este documento describe la capa de infraestructura y servidor que vive **dentro del mismo repositorio Next.js** (`apps/web/`). El "backend" es el conjunto de: Supabase (Auth + PostgreSQL), Prisma (ORM), Server Actions de React, API Routes para webhooks, y el middleware de Next.js.

---

## 1. Scope de esta capa

| Responsabilidad | Tecnología | Ubicación en el proyecto |
|---|---|---|
| Base de datos relacional | PostgreSQL vía Supabase | Cloud (Supabase) |
| ORM + migraciones | Prisma | `prisma/schema.prisma` |
| Singleton de DB client | Prisma Client | `src/lib/prisma/client.ts` |
| Auth (3 flujos) | Supabase Auth + Twilio | `src/app/(portal)/login/` |
| Cliente browser | Supabase JS | `src/lib/supabase/client.ts` |
| Cliente server SSR | Supabase SSR | `src/lib/supabase/server.ts` |
| Guard de rutas | Next.js Middleware | `src/middleware.ts` |
| Mutaciones | Server Actions | `src/app/(portal)/*/actions.ts` |
| Webhooks | API Routes | `src/app/api/webhooks/` |
| Importación CSV | Server Action + Streams | `src/app/(admin)/importar/actions.ts` |
| Row Level Security | Supabase SQL | Dashboard Supabase (policies) |

---

## 2. Setup inicial de Supabase

### 2.1 Pasos de creación del proyecto

```bash
# 1. Ir a https://supabase.com → New Project
# 2. Nombre: escobar-instalaciones-prod
# 3. Región: South America (São Paulo) — la más cercana a Argentina
# 4. Guardar la contraseña del proyecto (no se puede recuperar)
```

### 2.2 Las dos URLs críticas (NO mezclar)

Una vez creado el proyecto, ir a **Settings → Database → Connection string**:

| Variable | URL | Uso |
|---|---|---|
| `DATABASE_URL` | URI directa (puerto 5432) | SOLO `prisma migrate` y `prisma db push` — NUNCA en runtime |
| `DATABASE_URL_UNPOOLED` | URI de Supavisor (puerto 6543, `?pgbouncer=true`) | Runtime de producción — todo acceso desde el servidor Node.js |

> **Por qué dos:** Hostinger corre un proceso Node.js persistente. Si se usa la URL directa en runtime, cada request abre una conexión TCP a PostgreSQL. Con ~100 clientes simultáneos se agota el pool de conexiones del servidor de Supabase Free (25 conexiones). Supavisor multiplexa cientos de conexiones lógicas sobre pocas conexiones físicas.

### 2.3 Variables de entorno a copiar desde Supabase Dashboard

- `NEXT_PUBLIC_SUPABASE_URL` → Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings → API → anon key
- `SUPABASE_SERVICE_ROLE_KEY` → Settings → API → service_role key (**SECRETO, NUNCA al browser**)

---

## 3. Schema Prisma — modelo de datos completo

### 3.1 Archivo `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL_UNPOOLED")  // Supavisor — runtime
  directUrl = env("DATABASE_URL")            // Directa — solo migraciones
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum Rol {
  CLIENTE
  ADMIN
}

enum CategoriaCuenta {
  ALARMA_MONITOREO
  DOMOTICA
  CAMARA_CCTV
  ANTENA_STARLINK
  OTRO
}

enum EstadoCuenta {
  ACTIVA
  SUSPENDIDA_PAGO
  EN_MANTENIMIENTO
  BAJA_DEFINITIVA
}

enum TipoSensor {
  SENSOR_PIR
  CONTACTO_MAGNETICO
  CAMARA_IP
  TECLADO_CONTROL
  DETECTOR_HUMO
  MODULO_DOMOTICA
  PANICO
}

enum EstadoBateria {
  OPTIMA
  ADVERTENCIA
  CRITICA
}

enum EstadoPago {
  PENDIENTE
  PROCESANDO
  PAGADO
  VENCIDO
}

enum MetodoPago {
  MERCADOPAGO
  TALO_CVU
  EFECTIVO
  CHEQUE
}

enum EstadoSolicitud {
  PENDIENTE
  EN_PROCESO
  RESUELTA
}

enum Prioridad {
  BAJA
  MEDIA
  ALTA
}

// ─────────────────────────────────────────
// MODELOS
// ─────────────────────────────────────────

model Perfil {
  id         String   @id           // UUID de auth.users de Supabase
  nombre     String
  dni        String?  @unique
  telefono   String?  @unique       // E.164: +5491112345678
  email      String?  @unique
  rol        Rol      @default(CLIENTE)
  activo     Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  cuentas    Cuenta[]

  @@map("perfiles")
}

model Cuenta {
  id              String          @id @default(uuid())
  softguard_ref   String          @unique   // ID externo Softguard — clave de upsert
  perfil_id       String
  perfil          Perfil          @relation(fields: [perfil_id], references: [id])
  descripcion     String                    // dirección o nombre del inmueble
  categoria       CategoriaCuenta
  estado          EstadoCuenta    @default(ACTIVA)
  costo_mensual   Decimal         @default(20000) @db.Decimal(10, 2)
  zona_geografica String?
  notas_tecnicas  String?
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt

  sensores        Sensor[]
  pagos           Pago[]
  solicitudes     SolicitudMantenimiento[]

  @@index([perfil_id])
  @@map("cuentas")
}

model Sensor {
  id                String         @id @default(uuid())
  cuenta_id         String
  cuenta            Cuenta         @relation(fields: [cuenta_id], references: [id], onDelete: Cascade)
  codigo_zona       String                   // "Zona 01" — tal como viene de Softguard
  etiqueta          String                   // "Ventana Dormitorio Principal" — visible al cliente
  tipo              TipoSensor
  activa            Boolean        @default(true)
  bateria           EstadoBateria?
  alerta_mant       Boolean        @default(false)
  ultima_activacion DateTime?
  created_at        DateTime       @default(now())

  @@unique([cuenta_id, codigo_zona])         // clave natural para upsert desde Softguard
  @@index([cuenta_id])
  @@map("sensores")
}

model Pago {
  id             String      @id @default(uuid())
  cuenta_id      String
  cuenta         Cuenta      @relation(fields: [cuenta_id], references: [id])
  mes            Int                          // 1-12
  anio           Int                          // ej: 2026
  importe        Decimal     @db.Decimal(10, 2)
  estado         EstadoPago  @default(PENDIENTE)
  metodo         MetodoPago?
  ref_externa    String?     @unique          // ID de MP o Talo — unique garantiza idempotencia
  acreditado_en  DateTime?
  registrado_por String?                      // ID del admin que cargó pago manual
  created_at     DateTime    @default(now())
  updated_at     DateTime    @updatedAt

  @@unique([cuenta_id, mes, anio])           // imposible duplicar el mismo periodo
  @@index([cuenta_id])
  @@map("pagos")
}

model TarifaHistorico {
  id            String   @id @default(uuid())
  monto         Decimal  @db.Decimal(10, 2)
  vigente_desde DateTime
  creado_por    String                        // admin ID
  created_at    DateTime @default(now())

  @@map("tarifas_historico")
}

model SolicitudMantenimiento {
  id          String          @id @default(uuid())
  cuenta_id   String
  cuenta      Cuenta          @relation(fields: [cuenta_id], references: [id])
  descripcion String
  estado      EstadoSolicitud @default(PENDIENTE)
  prioridad   Prioridad       @default(MEDIA)
  creada_en   DateTime        @default(now())
  resuelta_en DateTime?

  @@index([cuenta_id])
  @@map("solicitudes_mantenimiento")
}
```

### 3.2 Tabla de columnas por entidad

#### `perfiles`

| Campo | Tipo Prisma | Restricción | Descripción |
|---|---|---|---|
| `id` | `String` | PK, = auth.users.id | UUID delegado de Supabase Auth |
| `nombre` | `String` | NOT NULL | Nombre completo del cliente |
| `dni` | `String?` | UNIQUE | DNI argentino sin puntos |
| `telefono` | `String?` | UNIQUE | Formato E.164 (+5491112345678) |
| `email` | `String?` | UNIQUE | Email real o sintético interno |
| `rol` | `Rol` | DEFAULT CLIENTE | CLIENTE o ADMIN |
| `activo` | `Boolean` | DEFAULT true | Soft delete / suspensión |
| `created_at` | `DateTime` | DEFAULT now() | Timestamp de creación |
| `updated_at` | `DateTime` | @updatedAt | Auto-actualizado por Prisma |

> **Restricción de negocio:** Al menos uno de `dni`, `telefono` o `email` debe estar presente. Validar en Server Action con Zod:
> ```typescript
> const perfilSchema = z.object({ dni: z.string().optional(), telefono: z.string().optional(), email: z.string().email().optional() })
>   .refine(d => d.dni || d.telefono || d.email, { message: 'Se requiere al menos DNI, teléfono o email' })
> ```

#### `cuentas`

| Campo | Tipo Prisma | Restricción | Descripción |
|---|---|---|---|
| `id` | `String` | PK, UUID | ID interno |
| `softguard_ref` | `String` | UNIQUE | ID externo del PSIM Softguard |
| `perfil_id` | `String` | FK → perfiles.id | Propietario de la cuenta |
| `descripcion` | `String` | NOT NULL | Dirección o nombre del inmueble |
| `categoria` | `CategoriaCuenta` | NOT NULL | Tipo de servicio |
| `estado` | `EstadoCuenta` | DEFAULT ACTIVA | Estado operativo de la cuenta |
| `costo_mensual` | `Decimal(10,2)` | DEFAULT 20000 | Tarifa mensual en ARS |
| `zona_geografica` | `String?` | — | Para segmentación geográfica |
| `notas_tecnicas` | `String?` | — | Solo visible para admin |
| `created_at` | `DateTime` | DEFAULT now() | — |
| `updated_at` | `DateTime` | @updatedAt | — |

#### `sensores`

| Campo | Tipo Prisma | Restricción | Descripción |
|---|---|---|---|
| `id` | `String` | PK, UUID | — |
| `cuenta_id` | `String` | FK → cuentas.id, CASCADE | Cuenta a la que pertenece |
| `codigo_zona` | `String` | NOT NULL | "Zona 01" — clave Softguard |
| `etiqueta` | `String` | NOT NULL | Nombre legible para el cliente |
| `tipo` | `TipoSensor` | NOT NULL | Tipo de dispositivo |
| `activa` | `Boolean` | DEFAULT true | Estado operativo |
| `bateria` | `EstadoBateria?` | — | Solo si aplica al tipo |
| `alerta_mant` | `Boolean` | DEFAULT false | Flag de mantenimiento pendiente |
| `ultima_activacion` | `DateTime?` | — | Timestamp del último evento |
| `created_at` | `DateTime` | DEFAULT now() | — |

#### `pagos`

| Campo | Tipo Prisma | Restricción | Descripción |
|---|---|---|---|
| `id` | `String` | PK, UUID | — |
| `cuenta_id` | `String` | FK → cuentas.id | Cuenta pagante |
| `mes` | `Int` | NOT NULL | 1-12 |
| `anio` | `Int` | NOT NULL | Ej: 2026 |
| `importe` | `Decimal(10,2)` | NOT NULL | Monto en ARS |
| `estado` | `EstadoPago` | DEFAULT PENDIENTE | Estado del pago |
| `metodo` | `MetodoPago?` | — | Cómo se pagó |
| `ref_externa` | `String?` | UNIQUE | ID de MP o Talo — garantiza idempotencia |
| `acreditado_en` | `DateTime?` | — | Cuando el webhook confirmó |
| `registrado_por` | `String?` | — | Admin ID si fue manual |
| `created_at` / `updated_at` | `DateTime` | — | — |

#### `tarifas_historico`

| Campo | Tipo Prisma | Restricción | Descripción |
|---|---|---|---|
| `id` | `String` | PK, UUID | — |
| `monto` | `Decimal(10,2)` | NOT NULL | Tarifa en ARS |
| `vigente_desde` | `DateTime` | NOT NULL | Desde cuándo aplica |
| `creado_por` | `String` | NOT NULL | Admin ID |
| `created_at` | `DateTime` | DEFAULT now() | — |

#### `solicitudes_mantenimiento`

| Campo | Tipo Prisma | Restricción | Descripción |
|---|---|---|---|
| `id` | `String` | PK, UUID | — |
| `cuenta_id` | `String` | FK → cuentas.id | Cuenta que solicita |
| `descripcion` | `String` | NOT NULL | Descripción del problema |
| `estado` | `EstadoSolicitud` | DEFAULT PENDIENTE | Estado de resolución |
| `prioridad` | `Prioridad` | DEFAULT MEDIA | — |
| `creada_en` | `DateTime` | DEFAULT now() | — |
| `resuelta_en` | `DateTime?` | — | Cuando admin marca como resuelta |

---

## 4. ERD — Diagrama de entidades

```mermaid
erDiagram
    PERFILES {
        string id PK
        string nombre
        string dni UK
        string telefono UK
        string email UK
        enum rol
        boolean activo
        datetime created_at
        datetime updated_at
    }

    CUENTAS {
        string id PK
        string softguard_ref UK
        string perfil_id FK
        string descripcion
        enum categoria
        enum estado
        decimal costo_mensual
        string zona_geografica
        string notas_tecnicas
        datetime created_at
        datetime updated_at
    }

    SENSORES {
        string id PK
        string cuenta_id FK
        string codigo_zona
        string etiqueta
        enum tipo
        boolean activa
        enum bateria
        boolean alerta_mant
        datetime ultima_activacion
        datetime created_at
    }

    PAGOS {
        string id PK
        string cuenta_id FK
        int mes
        int anio
        decimal importe
        enum estado
        enum metodo
        string ref_externa UK
        datetime acreditado_en
        string registrado_por
        datetime created_at
        datetime updated_at
    }

    TARIFAS_HISTORICO {
        string id PK
        decimal monto
        datetime vigente_desde
        string creado_por
        datetime created_at
    }

    SOLICITUDES_MANTENIMIENTO {
        string id PK
        string cuenta_id FK
        string descripcion
        enum estado
        enum prioridad
        datetime creada_en
        datetime resuelta_en
    }

    PERFILES ||--o{ CUENTAS : "tiene"
    CUENTAS ||--o{ SENSORES : "tiene"
    CUENTAS ||--o{ PAGOS : "tiene"
    CUENTAS ||--o{ SOLICITUDES_MANTENIMIENTO : "tiene"
```

---

## 5. Singleton Prisma Client

### `src/lib/prisma/client.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

> **Por qué singleton:** En desarrollo, el hot reload de Next.js crea múltiples instancias de PrismaClient si no se reutiliza. Cada instancia abre un pool de conexiones propio → se agota el límite de conexiones del servidor.

### Comandos de migración

```bash
# Solo con DATABASE_URL directa en .env.local — NUNCA usar Supavisor para esto
npx prisma migrate dev --name init          # primera migración
npx prisma migrate deploy                   # aplicar en producción
npx prisma generate                         # regenerar el client después de cambios al schema
```

---

## 6. Clientes Supabase SSR

### `src/lib/supabase/client.ts` — para componentes client-side

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts` — para Server Components y Server Actions

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorar en Server Components (read-only)
          }
        },
      },
    }
  )
}
```

### Cliente con service_role (operaciones admin — bypasea RLS)

```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // NUNCA al browser
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

---

## 7. Middleware de Next.js

### `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión (IMPORTANTE: no borrar esta llamada)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Guard para rutas del portal
  if (pathname.startsWith('/portal') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Guard para rutas del admin: requiere sesión + rol ADMIN
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar rol — consulta liviana a tabla perfiles
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfil?.rol !== 'ADMIN') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 8. Row Level Security (RLS)

Ejecutar en el SQL Editor de Supabase Dashboard:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_historico ENABLE ROW LEVEL SECURITY;

-- PERFILES: cada usuario ve y edita solo su propio perfil
CREATE POLICY "perfil_propio_select" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "perfil_propio_update" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- CUENTAS: cliente ve solo sus cuentas
CREATE POLICY "cuentas_propias_select" ON cuentas
  FOR SELECT USING (
    perfil_id = auth.uid()
  );

-- SENSORES: cliente ve sensores de sus cuentas
CREATE POLICY "sensores_propios_select" ON sensores
  FOR SELECT USING (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()
    )
  );

-- PAGOS: cliente ve pagos de sus cuentas
CREATE POLICY "pagos_propios_select" ON pagos
  FOR SELECT USING (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()
    )
  );

-- SOLICITUDES: cliente ve sus solicitudes, puede insertar
CREATE POLICY "solicitudes_propias_select" ON solicitudes_mantenimiento
  FOR SELECT USING (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()
    )
  );

CREATE POLICY "solicitudes_propias_insert" ON solicitudes_mantenimiento
  FOR INSERT WITH CHECK (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()
    )
  );
```

> **Admin bypass:** Los Server Actions del admin usan `createAdminClient()` con `service_role`, que bypasea RLS por diseño de Supabase. Esto es el comportamiento correcto y esperado.

---

## 9. Arquitectura de Server Actions

### Principio: sin API Routes para mutaciones

Todas las mutaciones van por Server Actions. Solo se usan API Routes para:
- `POST /api/webhooks/mercadopago` — notificaciones de pago MP
- `POST /api/webhooks/talo` — notificaciones de pago Talo
- `POST /api/webhooks/softguard` (futuro Fase 2 Softguard) — eventos en tiempo real

### Patrón estándar de Server Action

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const solicitudSchema = z.object({
  cuenta_id: z.string().uuid(),
  descripcion: z.string().min(10).max(500),
  prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA']),
})

export async function crearSolicitudMantenimiento(formData: FormData) {
  // 1. Autenticación
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 2. Validación con Zod
  const input = solicitudSchema.safeParse({
    cuenta_id: formData.get('cuenta_id'),
    descripcion: formData.get('descripcion'),
    prioridad: formData.get('prioridad'),
  })
  if (!input.success) return { error: input.error.flatten() }

  // 3. Verificar que la cuenta pertenece al usuario (doble check, además del RLS)
  const cuenta = await prisma.cuenta.findFirst({
    where: { id: input.data.cuenta_id, perfil_id: user.id }
  })
  if (!cuenta) return { error: { general: 'Cuenta no encontrada' } }

  // 4. Mutación
  await prisma.solicitudMantenimiento.create({ data: input.data })

  // 5. Revalidar y redirigir
  revalidatePath(`/portal/cuentas/${input.data.cuenta_id}`)
  redirect(`/portal/cuentas/${input.data.cuenta_id}?solicitud=ok`)
}
```

---

## 10. Flujos de autenticación

### Flujo de datos — Mermaid

```mermaid
flowchart TD
    A[Cliente en /login] --> B{¿Método?}
    B -->|Email + password| C[Server Action: signInWithPassword]
    B -->|WhatsApp OTP| D[SA: verificar telefono en perfiles]
    B -->|DNI + password| E[SA: buscar email interno por DNI]

    C --> F[Supabase Auth]
    D --> G[signInWithOtp channel:whatsapp]
    E --> H[prisma.perfil.findUnique dni]
    H --> I[signInWithPassword email_interno]

    G --> J[Twilio Verify → WhatsApp del usuario]
    J --> K[Usuario ingresa 6 dígitos]
    K --> L[verifyOtp type:sms]

    F --> M[JWT en cookie HttpOnly]
    I --> M
    L --> M
    M --> N[middleware.ts valida en cada request]
    N -->|CLIENTE| O[/portal/dashboard]
    N -->|ADMIN| P[/admin/dashboard]
```

### Implementación: Email + Password

```typescript
// src/app/(portal)/login/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginConEmail(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: 'Credenciales inválidas' }
  redirect('/portal/dashboard')
}
```

### Implementación: WhatsApp OTP

```typescript
export async function iniciarOtpWhatsApp(formData: FormData) {
  const supabase = await createClient()
  const telefono = formData.get('telefono') as string

  // Verificar que el teléfono existe en la DB antes de enviar el OTP
  const perfil = await prisma.perfil.findUnique({ where: { telefono } })
  if (!perfil) return { error: 'Teléfono no registrado' }

  const { error } = await supabase.auth.signInWithOtp({
    phone: telefono,
    options: { channel: 'whatsapp' }
  })
  if (error) return { error: 'No se pudo enviar el código' }
  return { success: true }
}

export async function verificarOtpWhatsApp(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    phone: formData.get('telefono') as string,
    token: formData.get('token') as string,
    type: 'sms',
  })
  if (error) return { error: 'Código inválido o expirado' }
  redirect('/portal/dashboard')
}
```

### Implementación: DNI + Password (email sintético)

```typescript
export async function loginConDni(formData: FormData) {
  const supabase = await createClient()
  const dni = formData.get('dni') as string
  const password = formData.get('password') as string

  // Construir email interno determinista
  const emailInterno = `dni_${dni}@interno.escobarinstalaciones.ar`

  const { error } = await supabase.auth.signInWithPassword({
    email: emailInterno,
    password,
  })
  if (error) return { error: 'DNI o contraseña incorrectos' }
  redirect('/portal/dashboard')
}

// Alta de cliente con DNI — solo admin puede hacer esto
export async function altaClienteConDni(data: {
  nombre: string
  dni: string
  telefono?: string
  passwordInicial: string
}) {
  const adminClient = createAdminClient()
  const emailInterno = `dni_${data.dni}@interno.escobarinstalaciones.ar`

  // Crear usuario en Supabase Auth
  const { data: authUser, error } = await adminClient.auth.admin.createUser({
    email: emailInterno,
    password: data.passwordInicial,
    user_metadata: { dni: data.dni, nombre: data.nombre },
    email_confirm: true,
  })
  if (error) return { error: error.message }

  // Crear perfil en DB
  await prisma.perfil.create({
    data: {
      id: authUser.user.id,
      nombre: data.nombre,
      dni: data.dni,
      telefono: data.telefono,
      email: emailInterno,
      rol: 'CLIENTE',
    }
  })
}
```

---

## 11. Integración de pagos

### 11.1 Mercado Pago — Checkout Wallet

```typescript
// src/app/(portal)/pagos/actions.ts
'use server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

export async function crearPreferenciaMercadoPago(cuentaId: string, mes: number, anio: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pago = await prisma.pago.findUnique({
    where: { cuenta_id_mes_anio: { cuenta_id: cuentaId, mes, anio } },
    include: { cuenta: true },
  })
  if (!pago || pago.cuenta.perfil_id !== user.id) return { error: 'Pago no encontrado' }

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })
  const preference = new Preference(client)

  const { body } = await preference.create({
    body: {
      items: [{
        title: `Monitoreo ${mes}/${anio} — ${pago.cuenta.descripcion}`,
        quantity: 1,
        unit_price: Number(pago.importe),
        currency_id: 'ARS',
      }],
      payment_methods: { default_payment_method_id: 'wallet_purchase' },
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      external_reference: pago.id,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=ok`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=error`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=pending`,
      },
    }
  })

  return { checkoutUrl: body.init_point }
}
```

### 11.2 Talo Pay — Transferencia CVU

```typescript
export async function crearIntencionTalo(cuentaId: string, mes: number, anio: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pago = await prisma.pago.findUnique({
    where: { cuenta_id_mes_anio: { cuenta_id: cuentaId, mes, anio } },
    include: { cuenta: true },
  })
  if (!pago || pago.cuenta.perfil_id !== user.id) return { error: 'Pago no encontrado' }

  const res = await fetch('https://api.talo.com.ar/payments/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TALO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Number(pago.importe),
      currency: 'ARS',
      description: `Monitoreo ${mes}/${anio} — Escobar Instalaciones`,
      external_id: pago.id,
      payment_methods: ['transfer'],
    }),
  })

  if (!res.ok) return { error: 'Error al crear intención de pago' }
  const data = await res.json()

  // Actualizar pago a estado PROCESANDO mientras espera confirmación
  await prisma.pago.update({
    where: { id: pago.id },
    data: { estado: 'PROCESANDO', metodo: 'TALO_CVU', ref_externa: data.id },
  })

  return { cvu: data.cvu, alias: data.alias, qr: data.qr_string, importe: pago.importe }
}
```

### 11.3 Webhook Mercado Pago — idempotente

```typescript
// src/app/api/webhooks/mercadopago/route.ts
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma/client'
import crypto from 'crypto'

function validarFirmaMP(body: string, signature: string, requestId: string, ts: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET!
  const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return hash === signature
}

export async function POST(req: Request) {
  const body = await req.text()
  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''

  const parts = xSignature.split(',')
  const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1] ?? ''
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1] ?? ''

  if (!validarFirmaMP(body, sig, xRequestId, ts)) {
    return new Response('Forbidden', { status: 403 })
  }

  const evento = JSON.parse(body)
  if (evento.type !== 'payment') return new Response('OK')

  const mpPaymentId = evento.data.id

  // Consultar detalle del pago a la API de MP
  const detRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
  })
  const detalle = await detRes.json()

  if (detalle.status === 'approved') {
    // ref_externa es UNIQUE → upsert es idempotente
    await prisma.pago.updateMany({
      where: { ref_externa: String(mpPaymentId) },
      data: { estado: 'PAGADO', metodo: 'MERCADOPAGO', acreditado_en: new Date() },
    })
    revalidatePath('/portal/pagos')
    revalidatePath('/admin/pagos')
  }

  return new Response('OK')
}
```

### 11.4 Webhook Talo Pay

```typescript
// src/app/api/webhooks/talo/route.ts
import crypto from 'crypto'
import { prisma } from '@/lib/prisma/client'
import { revalidatePath } from 'next/cache'

function validarFirmaTalo(body: string, signature: string): boolean {
  const secret = process.env.TALO_WEBHOOK_SECRET!
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return `sha256=${hash}` === signature
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-talo-signature') ?? ''

  if (!validarFirmaTalo(body, signature)) {
    return new Response('Forbidden', { status: 403 })
  }

  const evento = JSON.parse(body)
  if (evento.type !== 'payment.completed') return new Response('OK')

  await prisma.pago.updateMany({
    where: { ref_externa: String(evento.data.external_id) },
    data: { estado: 'PAGADO', acreditado_en: new Date() },
  })

  revalidatePath('/portal/pagos')
  revalidatePath('/admin/pagos')

  return new Response('OK')
}
```

---

## 12. Importación CSV Softguard

```typescript
// src/app/(admin)/importar/actions.ts
'use server'
import { Readable } from 'stream'
import { parse } from 'csv-parse'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { createAdminClient } from '@/lib/supabase/admin'

const softguardRowSchema = z.object({
  codigo_cuenta: z.string().min(1),
  nombre: z.string().min(1),
  dni: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().min(1),
  tipo_servicio: z.enum(['ALARMA', 'DOMOTICA', 'CAMARA', 'STARLINK', 'OTRO']),
  activa: z.string().transform(v => v === 'SI' || v === 'true' || v === '1'),
  zonas: z.string().optional(), // JSON string de zonas
})

function mapearCategoria(tipo: string): CategoriaCuenta {
  const mapa: Record<string, CategoriaCuenta> = {
    ALARMA: 'ALARMA_MONITOREO',
    DOMOTICA: 'DOMOTICA',
    CAMARA: 'CAMARA_CCTV',
    STARLINK: 'ANTENA_STARLINK',
    OTRO: 'OTRO',
  }
  return mapa[tipo] ?? 'OTRO'
}

export async function importarSoftguardCSV(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } })
  if (perfil?.rol !== 'ADMIN') return { error: 'Sin permisos' }

  const archivo = formData.get('csv') as File
  const buffer = Buffer.from(await archivo.arrayBuffer())

  const resultados = { ok: 0, errores: [] as string[] }

  // Node.js Streams — no carga el archivo completo en RAM
  const stream = Readable.from(buffer)
  const parser = stream.pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))

  for await (const row of parser) {
    const parsed = softguardRowSchema.safeParse(row)
    if (!parsed.success) {
      resultados.errores.push(`Fila inválida: ${JSON.stringify(row)}`)
      continue
    }

    const { codigo_cuenta, nombre, dni, telefono, direccion, tipo_servicio, activa, zonas } = parsed.data

    try {
      const adminClient = createAdminClient()
      const emailInterno = dni ? `dni_${dni}@interno.escobarinstalaciones.ar` : undefined

      // Upsert de usuario en Supabase Auth si tiene DNI
      let perfilId: string
      const perfilExistente = dni
        ? await prisma.perfil.findUnique({ where: { dni } })
        : undefined

      if (perfilExistente) {
        perfilId = perfilExistente.id
        await prisma.perfil.update({
          where: { id: perfilId },
          data: { nombre, telefono },
        })
      } else {
        const { data: authUser } = await adminClient.auth.admin.createUser({
          email: emailInterno ?? `cuenta_${codigo_cuenta}@interno.escobarinstalaciones.ar`,
          user_metadata: { dni, nombre },
          email_confirm: true,
        })
        perfilId = authUser.user.id
        await prisma.perfil.create({
          data: { id: perfilId, nombre, dni, telefono, email: emailInterno }
        })
      }

      // Upsert de cuenta
      const cuenta = await prisma.cuenta.upsert({
        where: { softguard_ref: codigo_cuenta },
        create: {
          softguard_ref: codigo_cuenta,
          perfil_id: perfilId,
          descripcion: direccion,
          categoria: mapearCategoria(tipo_servicio),
          estado: activa ? 'ACTIVA' : 'SUSPENDIDA_PAGO',
          costo_mensual: 20000,
        },
        update: {
          estado: activa ? 'ACTIVA' : 'SUSPENDIDA_PAGO',
          descripcion: direccion,
        },
      })

      // Upsert de sensores desde campo JSON de zonas
      if (zonas) {
        const zonasArr = JSON.parse(zonas) as Array<{ codigo: string; nombre: string; tipo: string; activa: boolean }>
        for (const zona of zonasArr) {
          await prisma.sensor.upsert({
            where: { cuenta_id_codigo_zona: { cuenta_id: cuenta.id, codigo_zona: zona.codigo } },
            create: {
              cuenta_id: cuenta.id,
              codigo_zona: zona.codigo,
              etiqueta: zona.nombre,
              tipo: zona.tipo as TipoSensor,
              activa: zona.activa,
            },
            update: { etiqueta: zona.nombre, activa: zona.activa },
          })
        }
      }

      resultados.ok++
    } catch (e) {
      resultados.errores.push(`Error en cuenta ${codigo_cuenta}: ${String(e)}`)
    }
  }

  return resultados
}
```

---

## 13. Variables de entorno

### `.env.example` (colocar en raíz del proyecto Next.js)

```bash
# ─── Supabase ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # NUNCA exponer al browser — solo Server Actions

# ─── Prisma — DOS URLs OBLIGATORIAS, no intercambiar ─────────────────────────
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
  # ↑ URL DIRECTA — solo para: prisma migrate dev / prisma db push

DATABASE_URL_UNPOOLED=postgresql://postgres.[ref]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  # ↑ URL SUPAVISOR — todo el runtime de producción en Hostinger

# ─── App ─────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://instalacionescob.ar

# ─── Mercado Pago ─────────────────────────────────────────────────────────────
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...                   # Para validar firma HMAC de webhooks

# ─── Talo Pay ────────────────────────────────────────────────────────────────
TALO_API_KEY=...
TALO_WEBHOOK_SECRET=...                 # Para validar firma HMAC de webhooks

# ─── Twilio (WhatsApp OTP) ───────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...

# ─── Seguridad interna ───────────────────────────────────────────────────────
ADMIN_EMAIL_DOMAIN=interno.escobarinstalaciones.ar
```

---

## 14. Flujo completo de request

```mermaid
sequenceDiagram
    participant Browser
    participant Hostinger as Hostinger Node.js
    participant Middleware as middleware.ts
    participant SC as Server Component
    participant SA as Server Action
    participant Prisma
    participant Supavisor
    participant PostgreSQL

    Browser->>Hostinger: GET /portal/dashboard
    Hostinger->>Middleware: intercept
    Middleware->>Middleware: createServerClient + getUser()
    alt No hay sesión JWT
        Middleware-->>Browser: 302 → /login
    else Sesión válida
        Middleware->>SC: render()
        SC->>Prisma: prisma.cuenta.findMany(...)
        Prisma->>Supavisor: TCP (URL pooled :6543)
        Supavisor->>PostgreSQL: Query multiplexada
        PostgreSQL-->>Supavisor: Resultados
        Supavisor-->>Prisma: Resultados
        Prisma-->>SC: Datos tipados
        SC-->>Browser: HTML streamado
    end

    Browser->>Hostinger: POST form → Server Action
    Hostinger->>SA: execute
    SA->>SA: auth.getUser() + Zod.parse()
    SA->>Prisma: mutación
    Prisma->>Supavisor: TCP pooled
    SA->>SA: revalidatePath()
    SA-->>Browser: redirect o response
```

---

## 15. Dependencias a instalar

```bash
cd apps/web

# Supabase SSR
npm install @supabase/supabase-js @supabase/ssr

# Prisma
npm install prisma @prisma/client
npx prisma init

# Pagos
npm install mercadopago

# Fechas (calendario de pagos)
npm install date-fns

# CSV parsing (importación Softguard)
npm install csv-parse

# Radix UI — instalar solo los primitivos necesarios
npm install @radix-ui/react-tabs @radix-ui/react-dialog @radix-ui/react-select \
  @radix-ui/react-toast @radix-ui/react-progress @radix-ui/react-avatar

# Accesibilidad — auditoría
npm install --save-dev axe-core @axe-core/playwright

# Tests
npm install --save-dev @playwright/test
```

---

## 16. Checklist de infraestructura — Fase 1

- [ ] Crear proyecto en Supabase (región São Paulo)
- [ ] Copiar `DATABASE_URL` (directa) y `DATABASE_URL_UNPOOLED` (Supavisor) al `.env.local`
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Crear `prisma/schema.prisma` con todos los modelos y enums
- [ ] Ejecutar `npx prisma migrate dev --name init`
- [ ] Verificar tablas creadas en Supabase Dashboard → Table Editor
- [ ] Crear `src/lib/prisma/client.ts` (singleton)
- [ ] Crear `src/lib/supabase/client.ts` (browser)
- [ ] Crear `src/lib/supabase/server.ts` (SSR)
- [ ] Crear `src/lib/supabase/admin.ts` (service_role)
- [ ] Crear `src/middleware.ts` con guards de portal y admin
- [ ] Habilitar RLS en todas las tablas (SQL Editor Supabase)
- [ ] Crear policies de RLS base (ver Sección 8)
- [ ] Agregar `output: 'standalone'` en `next.config.ts`
- [ ] Crear `.env.example` documentado
- [ ] Verificar `npm run build` sin errores con el standalone output
- [ ] Test local: acceder a `/portal/dashboard` sin sesión → redirige a `/login` ✓
- [ ] Test local: acceder a `/admin/dashboard` como CLIENTE → redirige a `/portal/dashboard` ✓

# Prompt para Claude Code
## Tarea: Generar `EscobarInstalaciones-PlataformaClientes-Requerimientos.md`

---

Sos un Arquitecto de Software Senior y Especialista Fullstack. Tu única tarea en esta
sesión es generar el archivo `EscobarInstalaciones-PlataformaClientes-Requerimientos.md`
en la raíz del repositorio. Este documento es la hoja de ruta técnica canónica del proyecto.
No escribas código de aplicación todavía. Solo el documento.

El tono es estrictamente técnico, directo, developer-to-developer, en español rioplatense.

---

## Contexto del proyecto

**Empresa:** Escobar Instalaciones — empresa familiar de instalación de sistemas de
seguridad (sensores, cámaras), domótica, antenas StarLink y electrónica en general.

**Objetivo:** Ampliar la landing page existente en `instalacionescob.ar` con un portal
de clientes y un panel de administración interno. La landing no se toca. Todo lo nuevo
vive bajo rutas separadas.

**Escala actual:** ~100 clientes, ~200 cuentas de monitoreo, tráfico bajo (uso interno).
Demografía: porcentaje alto de adultos mayores con baja alfabetización digital.

---

## Stack tecnológico — DEFINITIVO, no proponer alternativas

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 15+ (App Router) | Único repositorio, fullstack |
| Backend | Server Actions de React | Sin API Routes salvo webhooks |
| Base de datos | PostgreSQL vía Supabase | Free tier → Pro cuando escale |
| Auth | Supabase Auth | JWT en cookies seguras |
| ORM | Prisma | TypeScript strict, client singleton |
| Connection pool | Supavisor (nativo Supabase) | URL transaccional para queries, URL directa solo para migraciones DDL |
| UI base | Radix UI Primitives | Headless, accesibilidad nativa |
| Estilos | Tailwind CSS | shadcn/ui como scaffolding, no como dependencia permanente |
| Validación | Zod | Schemas compartidos cliente/servidor |
| Formularios | react-hook-form | Con resolvers de Zod |
| Fechas | date-fns | Calendario de pagos |
| Hosting | Hostinger Business | Node.js Web App, deploy desde GitHub |
| Build | `output: standalone` en next.config.mjs | Obligatorio para Hostinger |
| Pagos 1 | Mercado Pago | Checkout Wallet |
| Pagos 2 | Talo Pay | API REST CVU/alias, ~1% comisión |
| WhatsApp OTP | Twilio Verify | Canal: whatsapp |
| Auditoría a11y | axe-core | Integrado en CI |
| Tests E2E | Playwright | Fase 5 |

---

## Estructura de carpetas — incluir en el documento

```
src/
  app/
    (landing)/            ← landing existente, NO tocar
    (portal)/             ← clientes autenticados
      layout.tsx          ← font 18px base, skip-to-content
      dashboard/
      cuentas/
        [id]/
      pagos/
    (admin)/              ← gestión interna
      layout.tsx
      clientes/
      cuentas/
      pagos/
      importar/           ← carga CSV Softguard
    api/
      webhooks/
        mercadopago/
          route.ts
        talo/
          route.ts
  lib/
    supabase/
      client.ts           ← cliente browser (createBrowserClient)
      server.ts           ← cliente server SSR (createServerClient + cookies)
    prisma/
      client.ts           ← singleton con gestión de conexiones
  components/
    ui/                   ← primitivas Radix wrapeadas
    portal/               ← componentes específicos del portal
    admin/                ← componentes específicos del admin
  middleware.ts            ← root: protege /portal/* y /admin/*
```

---

## Sección 1 — Arquitectura de alto nivel y flujo de datos

El documento debe describir:

### Flujo de request típico
1. Request llega a Hostinger → proceso Node.js persistente (output standalone)
2. `middleware.ts` intercepta → valida JWT de Supabase en cookies → redirige a `/login`
   si no hay sesión válida
3. Para rutas `/admin/*`: además verifica que `perfil.rol === 'ADMIN'`
4. Server Component ejecuta → Prisma client consulta PostgreSQL vía **Supavisor**
   (URL transaccional agrupada, no la URL directa)
5. HTML renderizado se transmite al cliente → hidratación mínima
6. Mutaciones van por Server Actions → nunca exponen credenciales al browser

### Dos URLs de Supabase a distinguir obligatoriamente
- **URL directa** (`DATABASE_URL`): solo para `prisma migrate` y `prisma db push`. Nunca
  en runtime del servidor.
- **URL transaccional agrupada** (`DATABASE_URL_UNPOOLED` invertida): para Prisma en
  producción vía Supavisor. Multiplexa conexiones, protege la RAM del servidor de
  Hostinger ante picos.

### Mejora progresiva en Server Actions
Las mutaciones críticas (solicitar mantenimiento, registrar pago manual) deben funcionar
sin JavaScript activo en el cliente. Implementar con `<form action={serverAction}>` nativo
donde corresponda, especialmente para la demografía objetivo con dispositivos lentos.

### Webhooks como fuente de verdad de pagos
Los estados de pago en la UI son optimistas hasta que el webhook del procesador confirma.
El calendario solo cambia a "PAGADO_EXITOSAMENTE" cuando el webhook llega, valida su
firma criptográfica, y ejecuta el `revalidatePath` correspondiente.

---

## Sección 2 — Modelo de datos relacional (Prisma schema)

Incluir el schema completo en bloques de código Prisma. Convenciones:
- Nombres en **snake_case corto** (no nombres descriptivos largos)
- Todas las tablas con `created_at` y `updated_at` donde aplica
- Enums en SCREAMING_SNAKE_CASE

### Tabla: `perfiles`
Extiende `auth.users` de Supabase. La columna `id` es FK a `auth.users.id`.

```prisma
model Perfil {
  id                String    @id // mismo UUID que auth.users
  nombre            String
  dni               String?   @unique
  telefono          String?   @unique  // formato E.164 ej: +5491112345678
  email             String?   @unique
  rol               Rol       @default(CLIENTE)
  activo            Boolean   @default(true)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  cuentas           Cuenta[]

  @@map("perfiles")
}

enum Rol {
  CLIENTE
  ADMIN
}
```

Restricción de negocio: al menos uno de `dni`, `telefono` o `email` debe estar presente.
Validar en Server Action con Zod (no solo en DB).

### Tabla: `cuentas`

```prisma
model Cuenta {
  id                String          @id @default(uuid())
  softguard_ref     String          @unique  // ID externo Softguard
  perfil_id         String
  perfil            Perfil          @relation(fields: [perfil_id], references: [id])
  descripcion       String          // dirección o nombre del inmueble
  categoria         CategoriaCuenta
  estado            EstadoCuenta    @default(ACTIVA)
  costo_mensual     Decimal         @default(20000) @db.Decimal(10, 2)
  zona_geografica   String?
  notas_tecnicas    String?
  created_at        DateTime        @default(now())
  updated_at        DateTime        @updatedAt

  sensores          Sensor[]
  pagos             Pago[]
  solicitudes       SolicitudMantenimiento[]

  @@index([perfil_id])
  @@map("cuentas")
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
```

### Tabla: `sensores`

```prisma
model Sensor {
  id                String        @id @default(uuid())
  cuenta_id         String
  cuenta            Cuenta        @relation(fields: [cuenta_id], references: [id], onDelete: Cascade)
  codigo_zona       String        // ej: "Zona 01", tal como viene de Softguard
  etiqueta          String        // ej: "Ventana Dormitorio Principal" — visible al cliente
  tipo              TipoSensor
  activa            Boolean       @default(true)
  bateria           EstadoBateria?
  alerta_mant       Boolean       @default(false)
  ultima_activacion DateTime?
  created_at        DateTime      @default(now())

  @@index([cuenta_id])
  @@map("sensores")
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
```

### Tabla: `pagos`

```prisma
model Pago {
  id                  String        @id @default(uuid())
  cuenta_id           String
  cuenta              Cuenta        @relation(fields: [cuenta_id], references: [id])
  mes                 Int           // 1-12
  anio                Int           // ej: 2026
  importe             Decimal       @db.Decimal(10, 2)
  estado              EstadoPago    @default(PENDIENTE)
  metodo              MetodoPago?
  ref_externa         String?       @unique  // ID de MP o Talo — único para idempotencia
  acreditado_en       DateTime?
  registrado_por      String?       // admin que cargó pago manual
  created_at          DateTime      @default(now())
  updated_at          DateTime      @updatedAt

  @@unique([cuenta_id, mes, anio])  // imposible duplicar periodo
  @@index([cuenta_id])
  @@map("pagos")
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
```

### Tabla: `tarifas_historico`
Permite actualizar el precio sin perder trazabilidad de lo cobrado históricamente.

```prisma
model TarifaHistorico {
  id              String   @id @default(uuid())
  monto           Decimal  @db.Decimal(10, 2)
  vigente_desde   DateTime // fecha desde la que aplica
  creado_por      String   // admin ID
  created_at      DateTime @default(now())

  @@map("tarifas_historico")
}
```

### Tabla: `solicitudes_mantenimiento`

```prisma
model SolicitudMantenimiento {
  id           String          @id @default(uuid())
  cuenta_id    String
  cuenta       Cuenta          @relation(fields: [cuenta_id], references: [id])
  descripcion  String
  estado       EstadoSolicitud @default(PENDIENTE)
  prioridad    Prioridad       @default(MEDIA)
  creada_en    DateTime        @default(now())
  resuelta_en  DateTime?

  @@index([cuenta_id])
  @@map("solicitudes_mantenimiento")
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
```

---

## Sección 3 — UI/UX y Accesibilidad (a11y)

### Principio rector
La audiencia objetivo tiene prevalencia significativa de adultos mayores. Las WCAG 2.2
son el requerimiento funcional primario, no una recomendación.

### Stack de UI
- **Radix UI Primitives**: base de todos los componentes interactivos. Gestiona
  focus trap, keyboard navigation, ARIA roles y aria-expanded/aria-describedby/aria-hidden
  de forma nativa sin intervención manual.
- **Tailwind CSS**: estilos. Configurar `tailwind.config` con `fontSize` base de 18px
  para el portal (no la landing).
- **shadcn/ui**: usar solo como generador de scaffolding inicial de componentes.
  Los componentes generados se exponen como código propio en `/components/ui/` y
  se modifican libremente. No es una dependencia de runtime permanente.

### Reglas tipográficas obligatorias
- Usar unidades `rem`/`em`, nunca `px` para tipografía. Respetar zoom del SO.
- El texto debe escalar al 200% sin desbordamientos horizontales (WCAG 1.4.4).
- Interlineado mínimo: 1.5 para body text del portal.
- Contraste mínimo: relación 4.5:1 (WCAG AA). Objetivo: 7:1 (AAA) donde sea posible.

### Dimensiones táctiles
- Todo elemento interactivo: superficie mínima de 44×44px equivalentes (WCAG 2.5.5).
- Espaciado generoso entre elementos clickeables para evitar toques accidentales en
  usuarios con temblor o presbicia.

### Navegación
- Skip-to-content link en todos los layouts del portal y admin.
- Sin menús anidados ni colapsables en el portal de clientes. Estructuras planas.
- Todos los labels de formulario: explícitos con `<label htmlFor>`. Prohibido usar
  `placeholder` como sustituto de label.

### Calendario de pagos — especificación de accesibilidad multimodal
El estado de cada mes NO puede comunicarse solo por color (viola WCAG 1.4.1).
Implementar triple canal simultáneo:

| Estado | Color de fondo | Icono geométrico | Texto visible |
|---|---|---|---|
| VENCIDO / ADEUDADO | Rojo oscuro (>4.5:1) | Triángulo de advertencia grueso | "DEUDA — $20.000" |
| PAGADO | Verde oscuro (>4.5:1) | Check afirmativo grueso | "ABONADO" |
| PAGADO ADELANTADO | Verde + trama diagonal | Check + patrón de líneas | "CUBIERTO" |
| FUTURO / SIN DATA | Gris neutro | Sin icono | "—" |
| PROCESANDO | Azul + animación sutil | Reloj / spinner | "PROCESANDO" |

Un usuario con visión monocromática debe poder leer su estado sin interpretar colores.

---

## Sección 4 — Estrategia de autenticación

### Flujo 1: Email + contraseña (estándar Supabase)
```
Cliente → [email + password] → Server Action → supabase.auth.signInWithPassword()
→ JWT en cookie HttpOnly → Middleware valida en cada request
```

### Flujo 2: WhatsApp OTP
```
1. Cliente ingresa teléfono (+54...)
2. Server Action verifica que exista en tabla perfiles.telefono
3. supabase.auth.signInWithOtp({ phone, options: { channel: 'whatsapp' } })
   → Twilio Verify envía código a WhatsApp del usuario
4. Cliente ingresa 6 dígitos
5. supabase.auth.verifyOtp({ phone, token, type: 'sms' })
6. JWT en cookie → acceso al portal
```

### Flujo 3: DNI + contraseña (engineering workaround)
Supabase Auth requiere email o teléfono. Para DNI se usa delegación por metadatos:

```
ALTA del cliente (hecho por admin):
  - Admin registra DNI en perfiles.dni y en raw_user_meta_data de auth.users
  - Sistema genera email interno sintético determinista:
    dni_{numero_dni}@interno.escobarinstalaciones.ar
  - Se crea el usuario de Supabase con ese email interno

LOGIN del cliente con DNI:
  1. Server Action recibe [dni + password]
  2. Usando service_role key (NUNCA expuesta al browser):
     prisma.perfil.findUnique({ where: { dni } }) → obtiene el email interno
  3. supabase.auth.signInWithPassword({ email: emailInterno, password })
  4. JWT en cookie → acceso al portal
```

La contraseña del cliente para DNI se setea durante el alta por el admin.
El cliente nunca ve ni sabe que internamente usa un email.

### Row Level Security (RLS)
Habilitar RLS en todas las tablas de Supabase. Policies base:
- `perfiles`: SELECT/UPDATE solo donde `auth.uid() = id`
- `cuentas`: SELECT solo donde `perfil_id` corresponde a `auth.uid()`
- `pagos`: SELECT solo donde la `cuenta_id` pertenece al cliente autenticado
- `sensores`: idem cuentas
- Admin bypass: usar `service_role` desde Server Actions, que omite RLS por diseño

---

## Sección 5 — Integración Softguard (sync de datos)

### Fase 1: Importación CSV (inmediata)
Script de Node.js expuesto como Server Action restringido a rol ADMIN.

Pseudocódigo lógico:
```typescript
// Usar Node.js Streams para no saturar la RAM de Hostinger
// con archivos grandes en memoria completa
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { Readable } from 'stream'

async function importarSoftguardCSV(buffer: Buffer) {
  const stream = Readable.from(buffer)
  const parser = stream.pipe(parse({ columns: true, skip_empty_lines: true }))

  for await (const row of parser) {
    // Validar con Zod antes de tocar la DB
    const parsed = softguardRowSchema.parse(row)

    // Upsert idempotente — safe para reimportar el mismo CSV
    const perfil = await prisma.perfil.upsert({
      where: { dni: parsed.dni },
      create: { id: generateUUID(), nombre: parsed.nombre, dni: parsed.dni, telefono: parsed.telefono },
      update: { nombre: parsed.nombre, telefono: parsed.telefono },
    })

    const cuenta = await prisma.cuenta.upsert({
      where: { softguard_ref: parsed.codigo_cuenta },
      create: {
        softguard_ref: parsed.codigo_cuenta,
        perfil_id: perfil.id,
        descripcion: parsed.direccion,
        categoria: mapearCategoria(parsed.tipo_servicio),
        estado: parsed.activa ? 'ACTIVA' : 'SUSPENDIDA_PAGO',
        costo_mensual: 20000,
      },
      update: {
        estado: parsed.activa ? 'ACTIVA' : 'SUSPENDIDA_PAGO',
        descripcion: parsed.direccion,
      },
    })

    // Upsert de sensores por codigo_zona
    for (const zona of parsed.zonas) {
      await prisma.sensor.upsert({
        where: { cuenta_id_codigo_zona: { cuenta_id: cuenta.id, codigo_zona: zona.codigo } },
        create: { cuenta_id: cuenta.id, codigo_zona: zona.codigo, etiqueta: zona.nombre, tipo: mapearTipo(zona.tipo) },
        update: { etiqueta: zona.nombre, activa: zona.activa },
      })
    }
  }
}
```

### Fase 2: Webhooks Softguard (futuro)
Exponer `POST /api/webhooks/softguard` con validación de token bearer. Actualiza
en tiempo real el estado de sensores y cuentas cuando el PSIM emite eventos.

---

## Sección 6 — Integración de pagos

### Mercado Pago — Checkout Wallet
```typescript
// Server Action en /portal/pagos/actions.ts
import { MercadoPagoConfig, Preference } from 'mercadopago'

async function crearPreferenciaPago(cuentaId: string, mes: number, anio: number) {
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })
  const preference = new Preference(client)

  const pago = await prisma.pago.findUnique({
    where: { cuenta_id_mes_anio: { cuenta_id: cuentaId, mes, anio } }
  })

  const { body } = await preference.create({
    body: {
      items: [{ title: `Monitoreo ${mes}/${anio}`, quantity: 1, unit_price: Number(pago?.importe) }],
      payment_methods: { default_payment_method_id: 'wallet_purchase' },
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      external_reference: pago!.id, // UUID del registro en DB
    }
  })

  return body.init_point // URL de checkout de MP
}
```

### Talo Pay — Transferencia CVU
```typescript
async function crearIntenciónTalo(cuentaId: string, mes: number, anio: number) {
  const pago = await prisma.pago.findUnique({ ... })

  const res = await fetch('https://api.talo.com.ar/payments/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TALO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Number(pago?.importe),
      currency: 'ARS',
      description: `Monitoreo ${mes}/${anio} — Escobar Instalaciones`,
      external_id: pago!.id,
      payment_methods: ['transfer'],
    }),
  })

  const data = await res.json()
  // data.cvu, data.alias, data.qr_string → mostrar al cliente en caracteres grandes
  return data
}
```

### Webhook handler — idempotencia garantizada
```typescript
// /api/webhooks/mercadopago/route.ts
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  // 1. Validar firma HMAC con MP_WEBHOOK_SECRET
  if (!validarFirmaMP(body, signature)) return new Response('Forbidden', { status: 403 })

  const evento = JSON.parse(body)
  if (evento.type !== 'payment') return new Response('OK')

  const pagoId = evento.data.id
  const detalle = await fetchDetalleMP(pagoId) // llamada a MP API

  if (detalle.status === 'approved') {
    // ref_externa es unique → si ya existe, el upsert no hace nada (idempotencia)
    await prisma.pago.update({
      where: { ref_externa: String(pagoId) },
      data: { estado: 'PAGADO', acreditado_en: new Date() },
    })
    revalidatePath('/portal/pagos')
  }

  return new Response('OK')
}
```

El mismo patrón aplica para `/api/webhooks/talo/route.ts` con la firma de Talo.

---

## Sección 7 — Variables de entorno (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # NUNCA exponer al browser

# Prisma — DOS URLs distintas obligatorias
DATABASE_URL=postgresql://...            # URL directa — solo para migraciones
DATABASE_URL_UNPOOLED=postgresql://...   # URL Supavisor — runtime de producción

# App
NEXT_PUBLIC_APP_URL=https://instalacionescob.ar

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...

# Talo Pay
TALO_API_KEY=...

# Twilio (WhatsApp OTP)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...

# Seguridad interna
ADMIN_EMAIL_DOMAIN=interno.escobarinstalaciones.ar  # para emails sintéticos de DNI
```

---

## Sección 8 — Fases de ejecución técnica

### Fase 1 — Infraestructura base (~3 días)
- Inicializar Next.js 15 con TypeScript strict mode
- Configurar Supabase: crear proyecto, obtener ambas URLs (directa y Supavisor)
- Definir `schema.prisma` completo y ejecutar `prisma migrate dev`
- Configurar cliente Supabase SSR (`client.ts` + `server.ts`)
- Implementar `middleware.ts` con guards para `/portal` y `/admin`
- Configurar `next.config.mjs` con `output: 'standalone'`
- Crear `.env.example` documentado
- README con instrucciones de deploy en Hostinger hPanel (GitHub → Node.js Web App,
  output dir: `.next`, entry: `server.js`)
- Habilitar RLS en Supabase con policies base

### Fase 2 — Auth y portal base (~4 días)
- Implementar los 3 flujos de autenticación (Email / WhatsApp OTP / DNI)
- Login page accesible: tabs grandes, labels explícitos, sin captchas
- Layout del portal con skip-to-content, font 18px, breadcrumbs planos
- Layout del admin con navegación lateral simple
- Guards de rol verificados en middleware y en cada Server Action

### Fase 3 — Cuentas y sensores (~5 días)
- Dashboard del cliente: listado de cuentas con estado visual claro
- Vista de cuenta individual: sensores con etiquetas, estado batería, zona
- Solicitud de mantenimiento: formulario simple con mejora progresiva
- Panel admin: gestión de cuentas y clientes
- Todos los componentes con soporte completo de teclado (Radix)

### Fase 4 — Pagos y calendario (~6 días)
- Calendario de pagos con triple canal a11y (color + icono + texto)
- Integración Mercado Pago Checkout Wallet
- Integración Talo Pay REST (CVU/alias en caracteres grandes)
- Registro manual de pagos en efectivo/cheque (desde admin)
- Webhook handlers con validación de firma e idempotencia
- `revalidatePath` al confirmar pago → calendario actualiza sin reload manual

### Fase 5 — Sync Softguard, auditoría y deploy (~5 días)
- Script de importación CSV con Node.js Streams (no cargar archivo entero en RAM)
- Interface admin para subir CSV y ver log de importación
- Auditoría axe-core automatizada en CI
- Tests Playwright: flujos críticos (login, ver cuenta, iniciar pago)
- Deploy final a Hostinger Business:
  - Conectar repo GitHub en hPanel
  - Configurar variables de entorno de producción
  - Output dir: `.next`, Entry: `server.js` (standalone)
  - Verificar proceso Node.js persistente con restart automático
- Pruebas en sandbox de MP y Talo antes de activar producción

---

## Sección 9 — Decisiones de arquitectura tomadas (no reabrir)

Estas decisiones están cerradas. El documento no debe plantear alternativas:

1. **No Spring Boot**: el backend unificado en Next.js Server Actions elimina un
   servicio separado, simplifica el deploy y reduce costos a $0 adicional sobre
   el plan Business existente.

2. **Hostinger Business es suficiente**: 3 GB RAM, 2 CPU, 5 Node.js apps, 50 GB NVMe.
   Suficiente para ~100 clientes. Si escala, upgrade a Cloud Startup ($7.99/mes extra).

3. **Supabase Free tier es suficiente ahora**: 500 MB DB >> necesidad real (~15 MB),
   50K MAUs >> 100 clientes. Upgrade a Pro ($25 USD/mes) cuando haya más de 500
   clientes activos o se requieran backups automáticos con PITR.

4. **shadcn/ui es scaffolding, no dependencia**: los componentes generados se copian
   al repo y se modifican. Radix Primitives es la base de accesibilidad real.

5. **Dos URLs de Supabase son obligatorias**: DATABASE_URL directa solo para migraciones.
   DATABASE_URL_UNPOOLED vía Supavisor para todo el runtime. Mezclarlas provoca
   agotamiento de conexiones en el servidor compartido.

6. **RLS desde el día 1**: no es opcional. Cada tabla tiene policy. El service_role
   de los Server Actions bypass RLS por diseño de Supabase, que es el comportamiento
   esperado para operaciones admin.

7. **Panel admin en el mismo repositorio**: rutas `/admin/*` protegidas por middleware
   con verificación de `rol === 'ADMIN'`. No es una app separada.

---

## Entregable esperado de este prompt

El archivo generado debe llamarse exactamente:
`EscobarInstalaciones-PlataformaClientes-Requerimientos.md`

Debe incluir todas las secciones de este prompt desarrolladas con:
- Lenguaje técnico directo
- Bloques de código Prisma y TypeScript completos (los del prompt son la base, expandirlos)
- Tablas Markdown para el modelo de datos con columnas: Entidad | Campo | Tipo | Restricción | Descripción
- Diagramas en Mermaid donde aporten claridad (arquitectura, flujo de auth, ERD)
- Checklist de deploy al final
- Glosario de términos del negocio (Softguard, Supavisor, CVU, etc.) para futuros
  desarrolladores que no conozcan el contexto

El documento debe poder leerse de forma autónoma por cualquier desarrollador que
entre al proyecto sin contexto previo, y debe poder usarse directamente como brief
para cada fase de Claude Code.

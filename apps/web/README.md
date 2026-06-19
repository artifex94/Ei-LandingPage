<p align="center">
  <img src="public/logo.svg" alt="Escobar Instalaciones" width="110" height="110"/>
</p>

<h1 align="center">Escobar Instalaciones — Portal Web</h1>

<p align="center">
  Plataforma integral de gestión para empresa de seguridad electrónica.<br/>
  Portal de clientes · Panel admin · Integración SoftGuard · Facturación AFIP · App técnicos
</p>

<p align="center">
  <a href="https://instalacionescob.ar">instalacionescob.ar</a>
  &nbsp;·&nbsp;
  Victoria, Entre Ríos, Argentina
</p>

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, `output: standalone`) |
| UI | React 19, Tailwind CSS v4, Radix UI, Recharts |
| Auth | Supabase Auth (email/password, OAuth) |
| Base de datos | PostgreSQL — Supabase + Prisma 7 (adapter-pg) |
| Monitoreo operativo | SQL Server — SoftGuard `_Datos` (pool mssql, read-only) |
| Pagos | Mercado Pago SDK v2, Talo CVU |
| Notificaciones | Twilio WhatsApp Business API |
| Facturación | AFIP — flujo manual asistido + PDF |
| Deploy | Hostinger VPS · Node.js standalone · `tmp/restart.txt` |
| Tests | Playwright (E2E + a11y) |

---

## Arquitectura de rutas

```
/                        → Landing page pública (servicios, contacto, CTA portal)
/login                   → Autenticación (cliente / admin / técnico)

/portal/*                → Área de clientes autenticados
  dashboard              → Estado de cuenta, próximo vencimiento, clima
  cuentas/[id]           → Detalle de cuenta + sensores + últimos eventos
  pagos                  → Historial + pago online (MP / Talo)
  solicitud              → Nueva solicitud de mantenimiento / cambio de info
  facturas               → Visualización y descarga de comprobantes
  mis-turnos             → Historial de turnos del técnico

/admin/*                 → Panel interno (solo rol ADMIN)
  dashboard              → KPIs, gráficos de cobros, clima, alertas
  clientes               → CRUD de titulares (+ importación CSV)
  cuentas                → CRUD de cuentas de seguridad
  pagos                  → Registro de pagos, mora, cobranza
  facturacion            → Borradores AFIP, emisión de comprobantes
  empleados              → Gestión de personal, turnos, ausencias
  agenda                 → Tareas agendadas
  ot                     → Órdenes de trabajo
  vehiculo               → Reservas del Kangoo
  sync-softguard         → Estado de conexión al SQL Server de SoftGuard
  morosidad              → Listado de cuentas en mora
  configuracion          → Tarifa estándar, datos del emisor, env vars

/tecnico/*               → App campo (solo rol TECNICO)
  dashboard              → Resumen del día, vehículo, clima
  mi-dia / mi-semana     → Agenda personal
  ots                    → Órdenes de trabajo asignadas
  ot/[id]                → Detalle + cierre de OT en campo

/embed/cuenta/[ref]      → Vista embebida para URL Launcher de SoftGuard DSS (Fase 4)
/recibo/[id]             → Comprobante de pago imprimible
/api/webhooks/*          → Webhooks Mercado Pago y Talo
/api/cron/*              → Jobs programados (mensual, turnos)
/api/sync-softguard/ping → Test de conectividad SoftGuard (admin)
```

---

## Módulos del sistema

### Portal de clientes
Acceso autenticado para los ~50 titulares. Muestra estado de cuenta, sensores, últimos eventos de alarma (sincronizados desde SoftGuard), pagos pendientes y comprobantes. Incluye flujo de pago online con Mercado Pago y Talo CVU.

### Panel admin
Gestión completa del negocio: clientes, cuentas, cobros, órdenes de trabajo, agenda, empleados, turnos de guardia y facturación AFIP. Gráficos de cobros mensuales y KPIs de mora. Importación de clientes por CSV/XLS.

### Integración SoftGuard
Conexión read-only al SQL Server `_Datos` de SoftGuard (via `mssql` pool). Lee cuentas, eventos de alarma y estado de OTs. Si las credenciales no están configuradas, activa **modo degradado** (sin datos de SoftGuard, el portal sigue funcionando con los datos propios).

Ver [`docs/integracion-softguard.md`](docs/integracion-softguard.md) para setup completo en SQL Server.

### App de técnicos
Vista móvil optimizada para Ariel. Agenda semanal, OTs asignadas con posibilidad de cierre en campo y registro de firma del cliente.

### Facturación AFIP
Flujo asistido: el admin genera borradores desde Prisma, los descarga como CSV para importar en ARCA y sube el PDF resultante. No hay integración directa con AFIP (monotributista, volumen bajo).

### Cobranza progresiva
Job diario (`scripts/cobranza-progresiva.ts`) que escala automáticamente:  
+5 días → WhatsApp recordatorio · +15 días → banner en portal · +30 días → suspensión automática.

---

## Variables de entorno

Archivo `.env.local` para desarrollo. En producción: variables del servidor Hostinger.

```env
# ── Supabase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Prisma (PostgreSQL vía Supavisor) ─────────────────────────────────────────
DATABASE_URL=           # Session Pooler puerto 5432 (migraciones)
DATABASE_URL_UNPOOLED=  # Transaction Pooler puerto 6543 (runtime)

# ── SoftGuard SQL Server ───────────────────────────────────────────────────────
# Si no están presentes, el portal activa el modo degradado automáticamente.
SOFTGUARD_DB_HOST=      # IP del servidor SQL Server (LAN / VPN)
SOFTGUARD_DB_PORT=1433
SOFTGUARD_DB_USER=EI_PORTAL_RO
SOFTGUARD_DB_PASS=
SOFTGUARD_DB_NAME=_Datos
SOFTGUARD_DSS_HOST=     # IP del DSS (para CSP del URL Launcher, Fase 4)
SOFTGUARD_EMBED_SECRET= # Clave HMAC para tokens de embed (rotable)

# ── Pagos ─────────────────────────────────────────────────────────────────────
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
TALO_API_KEY=
TALO_WEBHOOK_SECRET=

# ── Twilio WhatsApp ────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=    # Número con prefijo whatsapp: (ej: whatsapp:+14155238886)

# ── WhatsApp público (landing) ─────────────────────────────────────────────────
NEXT_PUBLIC_WHATSAPP_NUMBER=5493436575372

# ── Clima (Open-Meteo no requiere clave) ──────────────────────────────────────
# Sin variable necesaria — API pública de Open-Meteo
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Iniciar servidor de desarrollo
npm run dev        # http://localhost:3000
```

> Prisma 7 requiere el adapter `@prisma/adapter-pg`. El cliente se genera en `src/generated/prisma/` (ignorado por git).

---

## Build y deploy (VPS Hostinger)

```bash
# 1. Build standalone
npm run build

# 2. Copiar assets al bundle
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# 3. Empaquetar
cd .next/standalone && zip -rq /tmp/deploy.zip .

# 4. Subir y desplegar en el servidor (puerto SSH 65002)
scp -P 65002 /tmp/deploy.zip usuario@147.93.14.237:/tmp/
ssh -p 65002 usuario@147.93.14.237 << 'EOF'
  cp ~/domains/instalacionescob.ar/nodejs/.env /tmp/ei_env_bak
  cd ~/domains/instalacionescob.ar/nodejs
  rm -rf .next node_modules public server.js package.json
  unzip -o /tmp/deploy.zip -d .
  cp /tmp/ei_env_bak .env
  touch tmp/restart.txt
EOF
```

---

## Base de datos (Prisma / Supabase)

**Modelos principales:**

| Modelo | Descripción |
|---|---|
| `Perfil` | Usuario autenticado (rol: CLIENTE / ADMIN / TECNICO) |
| `Cuenta` | Servicio de seguridad contratado por un titular |
| `Sensor` | Dispositivo asociado a una cuenta |
| `Pago` | Cuota mensual (estados: PENDIENTE / PAGADO / VENCIDO) |
| `Factura` / `FacturaItem` | Comprobantes AFIP (borrador → emitida) |
| `SolicitudMantenimiento` | Pedido de servicio técnico por el cliente |
| `OrdenTrabajo` | OT asignada a un técnico (estados completos) |
| `EventoAlarma` | Evento sincronizado desde SoftGuard |
| `Empleado` | Personal de la empresa (vinculado a Perfil) |
| `Turno` | Guardia de monitoreo (MAÑANA / TARDE / NOCHE) |
| `Vehiculo` / `ReservaVehiculo` | Kangoo AF628CN + reservas por OT |
| `TarifaHistorico` | Historial de cambios de tarifa estándar |
| `AuditLog` | Registro de todas las mutaciones del sistema |

**Migraciones:**
```bash
npx prisma migrate dev --name descripcion   # desarrollo
npx prisma migrate deploy                   # producción
```

**RLS (Supabase):** el archivo `supabase-rls.sql` contiene las políticas Row Level Security. Aplicar desde el SQL Editor de Supabase Dashboard.

---

## Scripts de operación

| Script | Uso |
|---|---|
| `setup-admin.ts` | Crea la cuenta admin de Ramiro en Supabase |
| `crear-empleadas.ts` | Crea cuentas Supabase para Candela, Carina y Paula |
| `seed-fase1.ts` | Registra el Kangoo y vincula a Ramiro y Ariel como empleados |
| `import-clientes.ts` | Importa titulares desde dump SQL (dry-run por defecto, `--apply` para ejecutar) |
| `marcar-pagos-hasta-abril.ts` | Carga inicial de pagos históricos como PAGADO |
| `cobranza-progresiva.ts` | Job diario de escalada de mora (WhatsApp → suspensión) |
| `verificar-cobertura-turnos.ts` | Alerta si hay franjas sin monitor asignado (cada 4 horas) |
| `cron-mensual.ts` | Job mensual: genera cuotas del período actual |
| `aplicar-rls.ts` | Aplica políticas RLS de Supabase desde `supabase-rls.sql` |
| `seed-sensores-softguard.ts` | Importa zonas de `m_zonas` (SoftGuard) como Sensores |
| `seed-vista-cuentas.sql` | DDL para vistas SQL Server en `_Datos` (ejecutar como sysadmin) |
| `test-bucket-facturas.ts` | Diagnóstico de Supabase Storage (bucket `facturas`) |
| `test-buckets-ot.ts` | Diagnóstico de Supabase Storage (buckets de OT) |

Todos los scripts TypeScript se ejecutan con:
```bash
npx tsx --env-file=.env.local scripts/<nombre>.ts
```

---

## Tests

```bash
# Todos los tests E2E
npx playwright test

# Con UI interactiva
npx playwright test --ui

# Solo accesibilidad
npx playwright test tests/a11y.spec.ts
```

Los tests cubren: flujos de login, facturación, conectividad SoftGuard y accesibilidad WCAG 2.1 AA.

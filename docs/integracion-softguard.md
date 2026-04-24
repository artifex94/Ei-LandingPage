# Integración SoftGuard ↔ Portal EI

Documentación operativa para conectar el portal Next.js a la base de datos SQL Server de SoftGuard (_Datos).

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│  Servidor de SoftGuard (LAN / VPN)                               │
│                                                                  │
│   SQL Server (_Datos)                                            │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  dbo.vw_ei_cuentas_resumen   (m_cuentas + XtraInfo)     │  │
│   │  dbo.vw_ei_eventos_recientes (EventosTimeLine -30d)     │  │
│   │  dbo.vw_ei_ot_estado         (m_st_cabecera)            │  │
│   └──────────────────────────────────────────────────────────┘  │
│                │ SELECT-only, usuario EI_PORTAL_RO               │
└────────────────┼────────────────────────────────────────────────┘
                 │ TCP 1433 (VPN/LAN)
┌────────────────▼────────────────────────────────────────────────┐
│  Portal Next.js (Hostinger / Vercel)                             │
│                                                                  │
│  src/lib/softguard/                                              │
│  ├── client.ts   — pool mssql, withSoftguardConnection()        │
│  ├── schema.ts   — tipos TS de las vistas                       │
│  ├── queries.ts  — getCuentaCount(), getCuentaBySoftguardRef()…  │
│  └── sync.ts     — syncCuentas(), syncEventos(), syncEstadoOT() │
│                                                                  │
│  /api/sync-softguard/ping  → test de conectividad (admin only)  │
│  /admin/sync-softguard     → panel de estado en la UI admin     │
└─────────────────────────────────────────────────────────────────┘
```

SoftGuard es **fuente de verdad operativa** (cuentas, eventos, OTs). El portal lee y nunca escribe salvo flujos explícitamente habilitados en `src/lib/softguard/writes.ts`.

---

## Prerrequisitos en el servidor SQL Server

Estos pasos los ejecuta un sysadmin del servidor (Ramiro u operador de SoftGuard):

### 1. Crear el login y usuario read-only

```sql
-- Login a nivel servidor
CREATE LOGIN EI_PORTAL_RO WITH PASSWORD = '<contraseña_fuerte>';

-- Usuario en la base de datos _Datos
USE [_Datos];
CREATE USER EI_PORTAL_RO FOR LOGIN EI_PORTAL_RO;

-- Solo lectura — sin ALTER, INSERT, UPDATE, DELETE
ALTER ROLE db_datareader ADD MEMBER EI_PORTAL_RO;
```

### 2. Crear las vistas

Ejecutar el archivo `scripts/seed-vista-cuentas.sql` en SQL Server Management Studio conectado a `[_Datos]` con un usuario que tenga permisos `CREATE VIEW`. El script es idempotente (`CREATE OR ALTER VIEW`).

### 3. Verificar permisos

Al final del script se ejecutan consultas de verificación:
```sql
SELECT TOP 5 * FROM dbo.vw_ei_cuentas_resumen  ORDER BY iid;
SELECT COUNT(*) FROM dbo.vw_ei_eventos_recientes;
SELECT COUNT(*) FROM dbo.vw_ei_ot_estado;
```

### 4. Habilitar conectividad

El servidor SQL debe aceptar conexiones TCP en el puerto 1433 (o el configurado en `SOFTGUARD_DB_PORT`) desde la IP del servidor del portal. Opciones:

- **VPN**: conectar el servidor de producción a la misma VPN que el servidor SoftGuard.
- **Regla de firewall**: permitir TCP 1433 solo desde la IP fija del portal.

---

## Variables de entorno

Agregar en `.env.local` (desarrollo) o en los secretos del servidor de producción:

```env
SOFTGUARD_DB_HOST=192.168.x.x        # IP o hostname del SQL Server
SOFTGUARD_DB_PORT=1433               # Puerto (default 1433)
SOFTGUARD_DB_USER=EI_PORTAL_RO       # Usuario read-only
SOFTGUARD_DB_PASS=<contraseña>       # Password del usuario
SOFTGUARD_DB_NAME=_Datos             # Nombre de la BD de SoftGuard

# Opcional: forzar modo mock aunque existan credenciales
# SOFTGUARD_MOCK=true
```

Si `SOFTGUARD_DB_HOST` o `SOFTGUARD_DB_PASS` no están presentes, el portal activa automáticamente el **modo mock** (datos ficticios, sin conexión real). Esto permite desarrollar y ejecutar CI sin necesidad de acceso al servidor SoftGuard.

---

## Modo mock (desarrollo y CI)

El modo mock está activo cuando:
- `SOFTGUARD_MOCK=true` está en el entorno, **o**
- `SOFTGUARD_DB_HOST` no está configurada, **o**
- `SOFTGUARD_DB_PASS` no está configurada.

En modo mock, `withSoftguardConnection()` devuelve datos ficticios definidos en `queries.ts` (constantes `MOCK_CUENTAS`, etc.) sin abrir ninguna conexión TCP. El portal muestra un banner naranja de advertencia en `/admin/sync-softguard`.

---

## Rotación de credenciales

`EI_PORTAL_RO` debe rotar su contraseña cada **90 días**:

1. En SQL Server: `ALTER LOGIN EI_PORTAL_RO WITH PASSWORD = '<nueva>';`
2. Actualizar `SOFTGUARD_DB_PASS` en producción y reiniciar el servidor Next.js.
3. Verificar en `/admin/sync-softguard` que el ping vuelve a responder OK.

---

## Jobs de sincronización

| Función | Frecuencia sugerida | Tabla destino |
|---|---|---|
| `syncCuentas()` | cada 6 horas | `cuentas` (actualiza `zona_geografica`) |
| `syncEventos()` | cada 5 minutos | `eventos_alarma` (upsert por unique key) |
| `syncEstadoOT()` | cada 30 minutos | `ordenes_trabajo` (campo `st_softguard_numero`) |

Los jobs se llaman desde el cron mensual (`scripts/cron-mensual.ts`) o desde endpoints HTTP en `/api/sync-softguard/`. Todos son idempotentes: si falla a mitad, la próxima ejecución completa el trabajo sin duplicar registros.

---

## Modo degradado

Si SoftGuard no está disponible, `withSoftguardConnection()` captura el error, cierra el pool roto y devuelve `{ ok: false, error: "..." }`. El portal continúa funcionando con sus propios datos (Prisma/Supabase). Las rutas que usan datos de SoftGuard muestran un banner de "datos no disponibles" sin romper la experiencia del usuario.

---

## URL Launcher (operadores en DSS)

Para que los operadores del centro de monitoreo puedan ver el perfil comercial del cliente desde la pantalla de atención de SoftGuard:

1. En DSS: Administrador → Sistema → Configuración → Links Externos.
2. Agregar URL: `https://instalacionescob.ar/embed/cuenta/{softguard_ref}`.
3. La ruta `/embed/cuenta/[softguard_ref]` (Fase 4) verifica el token HMAC firmado con `SOFTGUARD_EMBED_SECRET` y muestra el perfil sin la navegación del portal.

---

## Diagrama de flujo de datos

```
SoftGuard DSS
     │ (evento de alarma procesado)
     ▼
EventosTimeLine (SQL Server _Datos)
     │ syncEventos() cada 5 min
     ▼
EventoAlarma (PostgreSQL portal)
     │ query Prisma
     ▼
/portal/eventos  →  cliente ve sus eventos
/admin/eventos   →  admin ve todos los eventos
```

```
Cliente en portal
     │ solicita cambio de contacto (SolicitudCambioInfo)
     ▼
Admin aprueba en /admin/solicitudes-cambio
     │ (en Fase 4: lib/softguard/writes.ts → SolicitudesModificacion SoftGuard)
     ▼
Operador en DSS aplica el cambio en la cuenta
```

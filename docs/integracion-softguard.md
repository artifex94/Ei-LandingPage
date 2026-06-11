# Integración SoftGuard ↔ Portal EI

Documentación operativa para conectar el portal Next.js a SoftGuard.

---

## ⚠ Estado de conectividad — diagnóstico 2026-06-10

Se probó la conexión real al servidor de SoftGuard (`566204623fa9.sn.mynetname.net`, DDNS MikroTik → `200.117.55.15`):

| Prueba | Resultado |
|---|---|
| DNS / ICMP | ✅ resuelve y responde (~32 ms) |
| **TCP 1433 (SQL Server)** | ❌ **ETIMEOUT — filtrado en el MikroTik** |
| TCP 8080 | ✅ abierto → **suite web de SoftGuard** (login OAuth + reCAPTCHA) |
| TCP 443 | ✅ abierto (Microsoft-HTTPAPI) |
| UDP 1434 (SQL Browser) | ❌ sin respuesta |

**Conclusión:** el acceso directo a SQL (la arquitectura descrita más abajo) está bloqueado
por el firewall del cliente. Hay dos caminos para destrabarlo:

1. **Abrir 1433 / VPN**: port-forward TCP 1433 al SQL Server con regla de firewall para la IP
   del portal, o una VPN a la LAN de SoftGuard. El código SQL (`queries.ts`/`sync.ts`) ya está
   listo para esto.
2. **API web (:8080)** — ✅ **camino activo, funcionando**. La suite web expone una API REST
   autenticada. El login (`/OAuthLogin.ashx`) NO tiene reCAPTCHA enforced server-side, así que
   se automatiza con usuario/clave → cookie `OAuth_Token`. Implementado en
   `src/lib/softguard/web-api.ts`. Verificado 2026-06-10: ping OK, 2045 códigos de alarma.

---

## Camino activo: API web (:8080) — anti-corruption layer

`src/lib/softguard/api/` es el **anti-corruption layer (ACL)** sobre la suite web: el portal
nunca habla el dialecto de SoftGuard directamente. Organización (espeja los módulos del
Desktop de la suite); `web-api.ts` queda como shim de compatibilidad que re-exporta todo:

| Archivo | Módulo de la suite | Expone |
|---|---|---|
| `api/core.ts` | — (transporte) | config, login `OAuth_Token`, `restGet` con retry de sesión, normalización (`s`/`num`/`fecha`/`refCuenta`) |
| `api/monitoreo.ts` | MultiMonitor Web / Monitoreo Web Remoto | `fetchEventosHistoricoMM`, `fetchEventosPendientes`, `fetchCodigosAlarma` |
| `api/crm.ts` | CRM (SgWebCrm) | `fetchCuentasDealer` (cuentas + estado del panel), `fetchCuentasCount` |
| `api/sertec.ts` | Servicio Técnico | `fetchOrdenesServicio` (cabecera st + criterio de cierre), `fetchOrdenesServicioCount` |
| `api/sistema.ts` | Desktop | `pingWebApi`, `fetchModulosDesktop` |

Variables en `.env.local`:

```env
SOFTGUARD_API_BASE=http://<host>:8080
SOFTGUARD_API_USER=<usuario de la suite web>
SOFTGUARD_API_PASS=<clave>
SOFTGUARD_API_CLIENT_ID=<GUID del campo oculto ClientId del login>
```

**Flujo de login:** `GET /` (cookie sesión) → `POST /OAuthLogin.ashx` (302 con `Code`) →
`GET /OAuthCallback.ashx?...&Code=` (Set-Cookie `OAuth_Token`). Todas las llamadas REST van con
esa cookie + header `X-Requested-With: XMLHttpRequest`. La cookie se cachea ~25 min en el
proceso; ante HTTP de error o respuesta no-JSON, `restGet` invalida y reintenta UNA vez con
login fresco (auto-recuperación de mantenimientos/microcortes de la central).

**Requisitos del usuario web** (si algo devuelve 0 filas, revisar acá): línea de receptora
asignada, rango de cuentas y los módulos habilitados ("Monitoreo Web Remoto" destrabó la
visibilidad de cuentas y eventos).

**Endpoints REST validados con datos reales (2026-06-10):**

| Endpoint | Para qué | Notas |
|---|---|---|
| `GET /rest/token/IsValid` | salud de sesión | `{Status:1}` si ok |
| `GET /Rest/Search/DesktopModules` | catálogo de módulos + disponibilidad | 26 módulos, `udm_key_reference` |
| `GET /rest/search/codigosalarmas` | catálogo de códigos | 2045 filas, `cod_ccodigo`→descripción/prioridad/tipo |
| `GET /Rest/Search/ReporteHistoricoMM` | **últimos eventos recibidos** (grilla real del multimonitor) | `cod_nMultiMonitor=1`, sort `r.rec_tfechahora DESC`; trae `cod_cdescripcion` legible |
| `GET /Rest/search/EventosPendientes` | cola de alarmas **sin atender** | se vacía al procesarlas; cruzada con el histórico da el estado procesado/pendiente |
| `GET /Rest/Search/CuentaByDealer` | **cuentas con estado del panel** | sin filtros → todas (203); campos `sta_*`: fallo TST, último test, fallo AC, último evento |
| `GET /Rest/search/EventoTimeLineFull` | histórico por cuenta | requiere filtro de cuenta |
| `GET /Rest/search/ServTec` | **órdenes de servicio técnico** | modelo `stc_*`; la UI filtra activas con `stc_nestado:inint=1,2,5,6`; cerrada = estado fuera del set + `stc_dfecha_cierre` |

**Gotchas de los datos:** los campos del histórico y de pendientes difieren en mayúsculas
(`rec_iPrioridad`/`rec_isoFechaHora` vs `rec_iprioridad`/`rec_isofechahora`); strings con
padding de espacios; fechas en formato US o ISO; sentinel `1/1/1900` = "sin dato";
`softguard_ref` del portal se compone `linea-cuenta` ("ESI-0175"). **Logins concurrentes
del mismo usuario pueden pisar el handshake OAuth** (visto al correr sg-capture en paralelo
con la app): si el login falla "sin OAuth_Token", esperar a que termine la otra sesión.

**Sincronización:** `syncCuentasWebApi()` proyecta las cuentas del CRM en los campos `sg_*`
de `Cuenta` (estado de comunicación del panel), `syncEventosWebApi()` hace upsert de
pendientes en `EventoAlarma` y `syncEstadoOTWebApi()` cierra en el portal las OTs cuya orden
de SerTec está cerrada (estado fuera de 1,2,5,6 + fecha de cierre). El cron
`/api/cron/softguard` usa estas fuentes automáticamente cuando el SQL directo está en mock
(firewall) y la API web está configurada — **los tres jobs corren hoy por la API web**.

### Módulos de la suite (inventario 2026-06-10)

Los 26 módulos del Desktop reportan `disponible=1`. Estado de integración en el portal:

| Módulo (key) | Funcionalidad | Estado en el ACL |
|---|---|---|
| MultiMonitorWeb / Monitoreo Web Remoto (`WebRemoto`) | eventos en vivo, cola de pendientes | ✅ integrado (`api/monitoreo.ts`) |
| CRM (`WebCRM`) | cuentas, estado del panel, catálogos (tipos, geografía, plantillas SMS, listas de emergencia) | ✅ grilla integrada (`api/crm.ts`); detalle de cuenta (contactos/zonas/usuarios) sin explorar |
| Desktop (`Desktop`) | sesión, módulos, mensajería interna | ✅ parcial (`api/sistema.ts`) |
| SerTec (`SerTec`) | servicio técnico (OTs de la central) | ✅ integrado (`api/sertec.ts`); `syncEstadoOTWebApi()` reemplaza al SQL. OJO: el ícono del Desktop se llama "Servicio Técnico" (no "SerTec") |
| Administrador (`Administrator`) | configuración de la central | sin explorar (probable escritura — fuera de alcance) |
| Video, SmartPanics, TrackGuard, MapGuardWeb, VigiControl, Control de Acceso, etc. | video, pánico móvil, GPS, mapas, accesos | sin explorar |

**Receta para integrar un módulo nuevo:**

1. Capturar su tráfico real: `node --env-file=.env.local scripts/sg-capture.mjs "<Módulo>"`
2. Sondar el shape con datos reales (`scripts/sg-probe-eventos.mjs` como plantilla)
3. Crear `api/<modulo>.ts`: tipos `Raw*` (campos reales) + salida normalizada + fetchers via `restGet`
4. Exportar en `api/index.ts`; consumir desde endpoints `/api/admin/*` (autorización ADMIN)
5. **SOLO LECTURA** contra SoftGuard hasta decisión explícita del producto

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

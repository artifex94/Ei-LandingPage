# Integración SoftGuard ↔ Portal EI

Documentación operativa para conectar el portal Next.js a SoftGuard.

> **⚠ PIPELINE SQL RETIRADO (2026-06-11).** El acceso directo a SQL Server (TCP 1433,
> vistas `vw_ei_*`, dependencia `mssql`, modo mock) se eliminó del código: el puerto está
> filtrado en el MikroTik y el ACL de la API web lo reemplazó por completo (los tres jobs
> del cron corren por `:8080`). Las secciones marcadas **[RETIRADO]** más abajo quedan solo
> como referencia histórica por si algún día se abre el 1433 — el código vive en la
> historia de git (commits previos a esta fecha: `client.ts`, `queries.ts`, `schema.ts`,
> `scripts/seed-vista-cuentas.sql`, `scripts/seed-sensores-softguard.ts`).

---

## Estado de conectividad — diagnóstico 2026-06-10

Se probó la conexión real al servidor de SoftGuard (`566204623fa9.sn.mynetname.net`, DDNS MikroTik → `200.117.55.15`):

| Prueba | Resultado |
|---|---|
| DNS / ICMP | ✅ resuelve y responde (~32 ms) |
| **TCP 1433 (SQL Server)** | ❌ **ETIMEOUT — filtrado en el MikroTik** |
| TCP 8080 | ✅ abierto → **suite web de SoftGuard** (login OAuth + reCAPTCHA) |
| TCP 443 | ✅ abierto (Microsoft-HTTPAPI) |
| UDP 1434 (SQL Browser) | ❌ sin respuesta |

**Conclusión:** la API web (:8080) es **el camino activo**. La suite web expone una API
REST autenticada; el login (`/OAuthLogin.ashx`) no tiene reCAPTCHA enforced server-side,
así que se automatiza con usuario/clave → cookie `OAuth_Token`. El acceso SQL directo
quedó descartado y su código fue retirado (ver nota al inicio).

---

## Camino activo: API web (:8080) — anti-corruption layer

`src/lib/softguard/api/` es el **anti-corruption layer (ACL)** sobre la suite web: el portal
nunca habla el dialecto de SoftGuard directamente. Organización (espeja los módulos del
Desktop de la suite); los consumidores importan SIEMPRE de `@/lib/softguard/api` (el shim
`web-api.ts` fue retirado junto con el pipeline SQL):

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

## [RETIRADO] Arquitectura general — pipeline SQL directo

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

## [RETIRADO] Prerrequisitos en el servidor SQL Server

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

## [RETIRADO] Variables de entorno del pipeline SQL

Las variables `SOFTGUARD_DB_HOST/PORT/USER/PASS/NAME` y `SOFTGUARD_MOCK` ya no se leen
en ningún lado: se pueden borrar de `.env.local` y de los secretos de producción. Las
variables vigentes son las del ACL (`SOFTGUARD_API_BASE/USER/PASS/CLIENT_ID/TIMEOUT_MS`),
documentadas en §"Camino activo" y visibles en `/admin/sync-softguard`.

---

## Rotación de credenciales

El usuario de la suite web que usa el portal debe rotar su clave periódicamente:

1. En la suite web de SoftGuard: cambiar la clave del usuario del portal.
2. Actualizar `SOFTGUARD_API_PASS` en producción y reiniciar el servidor Next.js.
3. Verificar en `/admin/sync-softguard` que las sondas de módulos responden OK.

---

## Jobs de sincronización

| Función | Frecuencia | Tabla destino |
|---|---|---|
| `syncCuentasWebApi()` | cada corrida del cron | `cuentas` (dirección + proyección `sg_*` del panel) |
| `syncEventosWebApi()` | cada corrida del cron | `eventos_alarma` (upsert por unique key) |
| `syncEstadoOTWebApi()` | cada corrida del cron | `ordenes_trabajo` (cierre por criterio SerTec) |

Los tres corren en secuencia en `POST /api/cron/softguard` (Bearer `CRON_SECRET`,
recomendado cada 5 min). Todos son idempotentes: si falla a mitad, la próxima ejecución
completa el trabajo sin duplicar registros.

---

## Modo degradado

Si la central no está disponible (mantenimiento/microcorte), `restGet` invalida la cookie
de sesión y reintenta UNA vez con login fresco; si tampoco responde, lanza error y cada
consumidor degrada: el cron loguea y devuelve contadores en cero, y el multimonitor del
dashboard cae a los datos ya sincronizados en la DB con badge "SIN CONEXIÓN" (botón ↻ de
reconexión manual, `?relogin=1`). El portal sigue funcionando con sus propios datos.

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
     │ (evento de alarma recibido)
     ▼
API web :8080 (EventosPendientes / ReporteHistoricoMM)
     │ syncEventosWebApi() vía cron + lectura en vivo (/api/admin/eventos-live)
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

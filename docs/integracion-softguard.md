# Integración SoftGuard ↔ Portal EI

> **Arquitectura vigente: Web API REST de la suite SoftGuard (puerto 8080).**
> El diseño original por SQL Server directo (puerto 1433, usuario `EI_PORTAL_RO`,
> vistas `vw_ei_*`, paquete `mssql`) se construyó, se probó contra el servidor real
> y **se retiró el 2026-06-11** (commit `78264ac`): el puerto 1433 está filtrado por
> el firewall (MikroTik) del lado SoftGuard y no hay necesidad funcional que la API
> no cubra. No reconstruir el camino SQL — cualquier dato faltante se resuelve
> agregando un adaptador nuevo al ACL de la API (ver "Cómo agregar un endpoint").

## Arquitectura general

```
┌──────────────────────────────────────────────────┐
│  Portal Next.js (Hostinger)                      │
│                                                  │
│  src/lib/softguard/                              │
│  ├── api/            ← ACL sobre la Web API      │
│  │   ├── core.ts     ← login OAuth + restGet     │
│  │   ├── monitoreo.ts, crm.ts, sertec.ts,        │
│  │   │   sistema.ts  ← un adaptador por módulo   │
│  │   └── index.ts    ← único punto de import     │
│  ├── sync.ts         ← los 3 jobs de sync        │
│  └── fallo-sostenido.ts ← lógica pura TST/AC     │
└──────────────┬───────────────────────────────────┘
               │ HTTPS :8080 (cookie OAuth_Token, ~30 min,
               │ cacheada ~25 min, retry con login fresco)
┌──────────────▼───────────────────────────────────┐
│  Suite web SoftGuard (servidor de la central)    │
└──────────────────────────────────────────────────┘
```

**Regla de producto: SOLO LECTURA.** Ningún adaptador escribe contra SoftGuard; el
procesamiento de eventos y la gestión se hacen en la suite hasta nuevo aviso
(documentado también en el header de `core.ts`).

## Endpoints integrados (validados con datos reales)

| Endpoint SoftGuard | Adaptador | Uso |
|---|---|---|
| `GET /rest/token/IsValid` | `sistema.ts` | Salud de sesión (`pingWebApi`) |
| `GET /Rest/Search/DesktopModules` | `sistema.ts` | Catálogo de módulos de la suite |
| `GET /rest/search/codigosalarmas` | `monitoreo.ts` | Catálogo código→descripción/prioridad |
| `GET /Rest/Search/ReporteHistoricoMM` | `monitoreo.ts` | Últimos eventos recibidos |
| `GET /Rest/search/EventosPendientes` | `monitoreo.ts` | Cola sin atender |
| `GET /Rest/Search/CuentaByDealer` | `crm.ts` | Cuentas + estado del panel (TST/AC) |
| `GET /Rest/Search/Telefonos` | `crm.ts` | Contactos de aviso de una cuenta |
| `GET /Rest/search/ServTec` | `sertec.ts` | Órdenes de servicio (cierre de OTs) |

Sin explorar: detalle ampliado de cuenta del CRM (zonas/usuarios), Video,
SmartPanics, TrackGuard, MapGuardWeb, VigiControl, Control de Acceso.

## Sincronización

`POST /api/cron/softguard` (Bearer `CRON_SECRET`) corre en secuencia, cada ~5 min
(cron externo — hPanel de Hostinger o cron-job.org; ver
`docs/RUNBOOK-DEPLOY-2026-07-04.md`):

1. **`syncCuentasWebApi`** — dirección + proyección `sg_*` en `Cuenta` + solicitudes
   de mantenimiento `[AUTO]` por fallo sostenido TST/AC (umbral
   `SOFTGUARD_FALLO_SOSTENIDO_HORAS`, default 24 h, dedupe con cooldown 48 h).
2. **`syncEventosWebApi`** — upsert de `EventoAlarma` (no pisa estados ya
   gestionados) + backfill de `Cuenta.iid_softguard` (necesario para Telefonos).
3. **`syncEstadoOTWebApi`** — cierra `OrdenTrabajo` cuando SerTec la marcó cerrada.

Cada corrida queda registrada en `CronRun` (panel en `/admin/sync-softguard`).
Si la API no está configurada (`softguardWebApiConfigured() === false`), los syncs
devuelven `configured: false` y el endpoint responde 503 — **modo degradado**: el
portal sigue operando con su propia BD y el feed en vivo cae a la proyección local.

## Variables de entorno

```bash
SOFTGUARD_API_BASE=            # p.ej. http://<host-central>:8080
SOFTGUARD_API_USER=
SOFTGUARD_API_PASS=
SOFTGUARD_API_CLIENT_ID=
SOFTGUARD_API_TIMEOUT_MS=10000
SOFTGUARD_FALLO_SOSTENIDO_HORAS=24

# Embed para el URL Launcher de DSS (/embed/cuenta/<ref>)
SOFTGUARD_DSS_HOST=            # [BUILD] se hornea en el CSP (next.config.ts)
SOFTGUARD_DSS_ORIGIN=
SOFTGUARD_EMBED_SECRET=        # HMAC del token de un solo uso (5 min)
```

Las variables `SOFTGUARD_DB_*` y `SOFTGUARD_MOCK` del diseño SQL retirado ya no se
leen en ningún lado: se pueden borrar de `.env.local` y de los secretos de producción.

## Panel de estado

`/admin/sync-softguard`: salud de sesión + sondas funcionales con latencia por
endpoint (vía `/api/admin/softguard-status`), salud de los crons del portal,
estado de las env vars y contador de eventos sin procesar.

## Gotchas de datos (aprendidas con datos reales)

- Mayúsculas inconsistentes entre `ReporteHistoricoMM` y `EventosPendientes`; los
  adaptadores normalizan.
- Padding de espacios en varios campos → `trim()` en el ACL.
- Fechas en formato US o ISO según endpoint; el sentinel `1/1/1900` significa "sin
  fecha". Además la central manda hora local AR sin offset: parsear siempre con
  `parseFechaSoftguard` (`src/lib/fecha-ar.ts`).

## Rotación de credenciales

Cambiar la contraseña del usuario de la API en la suite → actualizar
`SOFTGUARD_API_PASS` en el panel del hosting → reiniciar la app. Si la sesión
cacheada quedó inválida, `invalidateWebApiSession()` (o esperar ~25 min).

## Cómo agregar un endpoint nuevo

1. Capturar el request real desde la suite (DevTools → pestaña Network).
2. Crear el adaptador en `src/lib/softguard/api/<modulo>.ts` usando `restGet` de
   `core.ts` (hereda login, retry y timeout) y normalizar el payload ahí.
3. Exportarlo desde `index.ts`, agregar fixture + test (`fixtures.ts`, `*.test.ts`).
4. Consumirlo solo desde server code (los adaptadores son `server-only`).

# Integración SoftGuard ↔ Portal EI

## Arquitectura general

```
┌─────────────────────────────────────────────┐
│  Portal Next.js (Hostinger / Vercel)        │
│                                             │
│  src/lib/softguard/                         │
│  ├── client.ts   ← pool mssql              │
│  ├── schema.ts   ← tipos TypeScript        │
│  └── queries.ts  ← funciones de lectura    │
└────────────────────┬────────────────────────┘
                     │ SQL Server (puerto 1433)
                     │ usuario: EI_PORTAL_RO (read-only)
                     │ via VPN / LAN
                     ▼
┌─────────────────────────────────────────────┐
│  Servidor SoftGuard — Rawson 255, Victoria  │
│  SQL Server (BD SoftGuard)                  │
│                                             │
│  Vistas expuestas al portal:                │
│  ├── vw_ei_cuentas_resumen                  │
│  ├── vw_ei_eventos_recientes                │
│  └── vw_ei_ot_estado                        │
└─────────────────────────────────────────────┘
```

El portal **solo lee**. Nunca modifica tablas internas de SoftGuard directamente. Las operaciones de escritura controlada (ej. crear OT, imputar pago) pasan por `src/lib/softguard/writes.ts` (Fase 3) con confirmación explícita de admin.

---

## Configuración inicial (Ramiro hace esto en el servidor)

### 1. Crear el usuario SQL read-only

Conectarse con `sa` o usuario `dbo` en SQL Server Management Studio y ejecutar:

```sql
CREATE LOGIN EI_PORTAL_RO WITH PASSWORD = '<password_fuerte_aqui>';
USE [NombreBaseSoftGuard];  -- reemplazar con el nombre real de la BD
CREATE USER EI_PORTAL_RO FOR LOGIN EI_PORTAL_RO;
ALTER ROLE db_datareader ADD MEMBER EI_PORTAL_RO;
GRANT SELECT ON SCHEMA::dbo TO EI_PORTAL_RO;
```

### 2. Crear las vistas

Ejecutar el script completo en:
```
apps/web/scripts/seed-vista-cuentas.sql
```

> **Antes de ejecutar:** verificar que los nombres de tabla y columna en el script coincidan con el schema real de SoftGuard. Los nombres en el script son estimaciones basadas en los manuales TEC223 y TEC218. Solicitar al soporte de SoftGuard el schema de tablas si es necesario.

### 3. Habilitar acceso de red

- Confirmar que el puerto 1433 de SQL Server está habilitado (SQL Server Configuration Manager → SQL Server Network Configuration → Protocols → TCP/IP → Enable).
- Agregar regla de firewall de Windows que permita tráfico entrante en puerto 1433 desde la IP pública del portal (o desde el rango de la VPN).
- Si la conexión es por VPN (recomendado): confirmar que el portal puede resolver `SOFTGUARD_DB_HOST` dentro de la red VPN.

### 4. Configurar variables de entorno en el portal

Agregar a `.env.local` (nunca commitear):

```env
SOFTGUARD_DB_HOST=192.168.x.x     # IP del servidor SoftGuard en la red
SOFTGUARD_DB_PORT=1433
SOFTGUARD_DB_USER=EI_PORTAL_RO
SOFTGUARD_DB_PASS=<password_del_paso_1>
SOFTGUARD_DB_NAME=<nombre_de_la_BD>
SOFTGUARD_EMBED_SECRET=<string_aleatorio_32_chars_para_HMAC>

# IP del servidor DSS (para Content-Security-Policy del /embed/*)
SOFTGUARD_DSS_HOST=192.168.x.x
```

Para producción (Hostinger/Vercel): agregar las mismas variables en el panel de entorno del hosting.

### 5. Verificar

Reiniciar el portal (`npm run dev`) y navegar a `/admin/sync-softguard`. Hacer click en **"Probar conexión"**. Debe mostrar:
- Modo: Real
- Cuentas en vista: N (número de cuentas encontradas)
- Latencia: < 500 ms (si la VPN es local)

---

## Variables de entorno de referencia

| Variable | Descripción | Requerida |
|---|---|---|
| `SOFTGUARD_DB_HOST` | IP o hostname del servidor SQL Server | Sí |
| `SOFTGUARD_DB_PORT` | Puerto TCP (default 1433) | No |
| `SOFTGUARD_DB_USER` | Usuario read-only (EI_PORTAL_RO) | Sí |
| `SOFTGUARD_DB_PASS` | Password del usuario | Sí |
| `SOFTGUARD_DB_NAME` | Nombre de la base de datos | Sí |
| `SOFTGUARD_EMBED_SECRET` | Secreto HMAC para firmar tokens del iframe (Fase 4) | Sí (Fase 4) |
| `SOFTGUARD_DSS_HOST` | IP del DSS para CSP `frame-ancestors` (Fase 4) | No (Fase 4) |
| `SOFTGUARD_MOCK` | `true` para forzar modo mock | No |

---

## Modo mock

Si `SOFTGUARD_MOCK=true` o si faltan `SOFTGUARD_DB_HOST` / `SOFTGUARD_DB_PASS`, la capa de integración devuelve datos ficticios predefinidos en `src/lib/softguard/queries.ts`. Esto permite:

- Desarrollar sin acceso al servidor real.
- Correr CI/Playwright sin credenciales.

El banner amarillo en `/admin/sync-softguard` indica cuando el modo mock está activo.

---

## Rotación de credenciales

- **Cada 90 días:** cambiar el password de `EI_PORTAL_RO` en SQL Server → actualizar `SOFTGUARD_DB_PASS` en el hosting → reiniciar el portal.
- **`SOFTGUARD_EMBED_SECRET`:** rotable desde `/admin/configuracion` (Fase 4) sin necesidad de re-deploy.

---

## Próximas vistas a agregar (por fase)

| Vista | Fase | Manual de referencia |
|---|---|---|
| `vw_ei_solicitudes_modificacion` | F3 | TEC216 AWCC |
| `vw_ei_camaras` | F6 | TEC240 Video |
| `vw_ei_notificaciones_emitidas` | F6 | TEC166 Reportes Notificaciones |
| `vw_ei_cercos` | F6 (condicional) | TEC300 Admin Cercos |

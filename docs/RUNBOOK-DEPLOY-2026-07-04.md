# Runbook — Deploy 2026-07-04 + puesta en marcha de crons

Objetivo: llevar a producción el main actual (commit `0875e7a` — PRs #27-41: perf +
limpieza + fases 4-perfiles ya mergeadas antes) y dejar los tres crons corriendo.
Contexto: producción hoy corre un build de ~22-jun; el cierre mensual de julio no corrió
(0 pagos de julio generados), la proyección SoftGuard de cuentas está congelada y el
panel de salud de crons no registra corridas.

## 1. Subir el nuevo build

ZIP ya generado: **`infra/deploy/frontend/ei-source-2026-07-04.zip`** (1.5 MB, desde main).

1. hPanel → Node.js App → subir el ZIP y descomprimir como raíz de la app.
2. Verificar variables de entorno ANTES de compilar (§2).
3. Build: `npm install && npm run build` · Start: `npm start`.
4. Reiniciar la app (Passenger: `touch tmp/restart.txt`).

## 2. Variables de entorno a verificar en el panel

Además de las que ya funcionan (`DATABASE_URL`, `SUPABASE_*`, `SOFTGUARD_API_*` — el
sync de eventos andaba, así que están bien), confirmar que existan:

| Variable | Para qué | Cómo saber si falta |
|---|---|---|
| `CRON_SECRET` | Auth de los 3 endpoints de cron | Sin esto los crons devuelven 401/503 |
| `TWILIO_TEMPLATE_MOROSIDAD` (+ `TWILIO_*`) | Avisos automáticos de deuda del cierre mensual | El cierre corre pero reporta errores de envío |
| `SOFTGUARD_FALLO_SOSTENIDO_HORAS` (opcional, default 24) | Solicitudes AUTO por panel en fallo | — |
| `SOFTGUARD_DSS_ORIGIN` / `SOFTGUARD_DSS_HOST` | CSP del embed para DSS | Solo afecta /embed |

`.env.example` es la plantilla canónica. Las `NEXT_PUBLIC_*` se hornean en el build.

## 3. Configurar los cron jobs (hPanel → Cron Jobs)

Los tres endpoints se disparan por HTTP POST con el secreto. Reemplazar `$CRON_SECRET`
por el valor real y `https://instalacionescob.ar` por el dominio de la app si difiere:

```bash
# 1) Sync SoftGuard (cuentas + eventos + cierre de OTs) — CADA 5 MINUTOS
*/5 * * * *  curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://instalacionescob.ar/api/cron/softguard

# 2) Auto-asignación de turnos — CADA 4 HORAS
0 */4 * * *  curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://instalacionescob.ar/api/cron/turnos

# 3) Cierre mensual (pagos del mes + avisos + borradores de factura) — DÍA 1, 8:00 ART (11:00 UTC)
0 11 1 * *   curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://instalacionescob.ar/api/cron
```

Si el hPanel no permite curl directo, cron-job.org con los mismos requests funciona igual.

## 4. Catch-up de julio (una sola vez, después del deploy)

El cierre mensual de julio no corrió. El job es **idempotente** (pagos con
`createMany + skipDuplicates` sobre unique `cuenta_id+mes+anio`; avisos con registro
anti-duplicado por mes), así que correrlo el día 4 es seguro:

```bash
curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://instalacionescob.ar/api/cron
```

⚠️ **Esto envía WhatsApps REALES**: el paso 3 avisa la deuda del mes a todos los
titulares activos con teléfono (mismo comportamiento que ya corrió el 1-jun — hay 100
notificaciones registradas de esa corrida). Si preferís generar los pagos SIN avisar
todavía, decímelo antes: se puede correr con los avisos desactivados tocando el env de
Twilio, pero lo natural es dejar que salgan.

## 5. Verificación post-deploy (checklist)

- [ ] `/admin/sync-softguard` → el panel "Salud de crons" muestra corridas del
      `softguard-sync` cada 5 min con estado OK (antes: vacío).
- [ ] `/admin/pagos` → julio muestra ~190 pagos PENDIENTE (antes: "Sin pago registrado (193)").
- [ ] `/admin/dashboard` → sin banner "Un cron del sistema está atrasado o falló";
      carga notablemente más rápida (streaming + counts consolidados del nuevo build).
- [ ] `/admin/cuentas` → columna de estado SoftGuard con `sg_synced_at` del día.
- [ ] Después de ~1 hora de syncs: los contactos de aviso en el modal de WhatsApp del
      monitoreo salen de SoftGuard (backfill de `iid_softguard` poblado) en vez del
      teléfono del perfil.
- [ ] `/admin/facturacion` → borradores de julio generados por el catch-up.

Cualquier ítem que no cierre: avisarme y lo investigo.

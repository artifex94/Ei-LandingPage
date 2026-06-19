# Standing Orders — Escobar Instalaciones

## Cron mensual de pagos y notificaciones

**Autoridad:** Permanente. No requiere confirmación para ejecutar.

**Trigger:** El día 1 de cada mes a las 08:00 AM (hora Argentina, UTC-3).

**Tarea:** Ejecutar el script de cron mensual con el siguiente comando exacto:

```bash
cd /home/artifex/dev/EscobarInstalaciones/apps/web && set -a && source .env.local && set +a && npx tsx scripts/cron-mensual.ts
```

**Verificación obligatoria después de ejecutar:**
1. Confirmar que la salida muestra "Pagos creados: X" sin errores fatales.
2. Si hay "Errores de envío" > 0, reportarme el detalle.
3. Si el script falla completamente, notificarme de inmediato.

**Reporte:** Después de cada ejecución exitosa, enviarme un resumen con:
- Cuántos pagos se crearon
- Cuántos clientes fueron notificados
- Si hubo algún error

**Escalación:** Si el script falla 2 veces seguidas, pausar y notificarme antes de reintentar.

**Scope permitido:** Solo ejecutar ese comando exacto. No modificar archivos, no conectarse a servicios externos adicionales, no tomar otras acciones.

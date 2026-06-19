# Tarea pendiente — Integración OpenClaw + Cron Mensual

**Estado:** Pendiente de implementación  
**Prioridad:** Media — implementar antes del 1° de mayo 2026

---

## Objetivo

Usar OpenClaw (ya instalado en la PC de Ariel) para ejecutar automáticamente el 1° de cada mes un script Node.js que:
1. Crea registros `Pago PENDIENTE` para el mes en curso en todas las cuentas ACTIVA
2. Marca como `VENCIDO` los pagos `PENDIENTE` de meses anteriores
3. Envía notificaciones por WhatsApp vía Twilio a los clientes con deuda

Sin Vercel, sin Next.js corriendo, sin exposición del agente de IA a los clientes.

---

## Archivos ya creados

| Archivo | Descripción |
|---|---|
| `frontend/Ei-LandingPage/scripts/cron-mensual.ts` | Script standalone — conecta a Supabase + Twilio directamente |
| `AGENTS.md` (raíz del repo) | Standing Order para OpenClaw — instrucciones de ejecución automática |

---

## Arquitectura

```
Día 1, 08:00 AM
      ↓
OpenClaw (agente local, PC de Ariel)
  ejecuta: npx tsx scripts/cron-mensual.ts
      ↓
Script conecta a Supabase → crea pagos PENDIENTE + marca VENCIDO
      ↓
Script llama Twilio REST → envía WhatsApp a clientes con deuda
      ↓
Clientes reciben notificación (número Twilio: +54 343 445 1027)
      ↓
Si un cliente responde → Twilio responde con TwiML vacío → silencio
      ↓
OpenClaw NUNCA ve esa respuesta (dmPolicy: allowlist)
```

---

## Pasos de implementación

### Paso 1 — Probar el script localmente

```bash
cd /home/artifex/dev/EscobarInstalaciones/frontend/Ei-LandingPage
set -a && source .env.local && set +a && npx tsx scripts/cron-mensual.ts
```

Verificar que la salida muestre:
- `Pagos creados: X`
- `Notificados: X`
- `Errores de envío: 0`

### Paso 2 — Configurar seguridad en OpenClaw

Editar `~/.openclaw/config.json` y agregar:

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+54343XXXXXXXX"],
      "groupPolicy": "disabled"
    }
  }
}
```

Reemplazar `+54343XXXXXXXX` con el número propio de Ariel en formato E.164.

> **Por qué:** Con `dmPolicy: allowlist` + solo el número propio, ningún cliente puede activar el agente aunque responda el WhatsApp de notificación. OpenClaw nunca procesa esos mensajes.

### Paso 3 — Activar la Standing Order en OpenClaw

Mandar este mensaje al agente (Control UI o WhatsApp):

> "Leé el archivo AGENTS.md en `/home/artifex/dev/EscobarInstalaciones/AGENTS.md` y configurá la standing order de cron mensual que dice ahí. A partir de ahora ejecutala automáticamente el 1° de cada mes a las 8 AM."

### Paso 4 — Configurar Twilio para ignorar respuestas entrantes

En Twilio Console → Phone Numbers → +543434451027 → Messaging:
- **"A message comes in"**: configurar un TwiML Bin con contenido:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response />
```

O con respuesta automática:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Este número es solo para notificaciones. Para consultas escribinos al 343-657-5372.</Message>
</Response>
```

---

## Variables de entorno necesarias

Todas ya están en `.env.local`. Verificar que existan:

```
DATABASE_URL=...          # Supabase Supavisor (ya configurada)
TWILIO_ACCOUNT_SID=...    # Ya configurada
TWILIO_AUTH_TOKEN=...     # Ya configurada
TWILIO_PHONE_NUMBER=+543434451027  # Ya configurada
```

---

## Seguridad — resumen de capas

| Canal | Usuario | ¿Puede interactuar el cliente? |
|---|---|---|
| OpenClaw WhatsApp | Solo Ariel | ❌ No (`dmPolicy: allowlist`) |
| Twilio +543434451027 | Notificaciones a clientes | ❌ No (TwiML vacío) |
| Script `cron-mensual.ts` | Solo OpenClaw lo ejecuta | ❌ No (no tiene endpoint público) |

---

## Notas

- OpenClaw usa WhatsApp Web (Baileys) — necesita que el QR esté vinculado y el gateway corriendo
- Si OpenClaw no está corriendo el día 1, la tarea no se ejecuta → considerar también Windows Task Scheduler como fallback (ver sección de backup abajo)
- El script es idempotente: si se ejecuta dos veces en el mismo día no crea pagos duplicados

### Fallback con Windows Task Scheduler (opcional)

Si OpenClaw no está disponible, crear `C:\Users\rami_\cron-pagos.ps1`:

```powershell
$env:DATABASE_URL = "postgresql://..."
$env:TWILIO_ACCOUNT_SID = "..."
$env:TWILIO_AUTH_TOKEN = "..."
$env:TWILIO_PHONE_NUMBER = "+543434451027"

cd "\\wsl.localhost\Ubuntu\home\artifex\dev\EscobarInstalaciones\frontend\Ei-LandingPage"
npx tsx scripts/cron-mensual.ts
```

Registrar en Task Scheduler:
```powershell
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NonInteractive -File C:\Users\rami_\cron-pagos.ps1"
$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At "08:00AM"
Register-ScheduledTask -TaskName "EscobarInstalaciones-CronPagos" -Action $action -Trigger $trigger -RunLevel Highest
```

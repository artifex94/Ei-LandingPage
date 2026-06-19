# Plan de iteración — Fachada SoftGuard + workflow operativo

> Trazado el 2026-06-10 a pedido del usuario: iterar sobre lo construido para generar
> **ganancia real en la metodología de trabajo** (de ver datos → a accionar con ellos).
> Trabajar las fases EN ORDEN salvo pedido explícito. Cada fase cierra con: tsc + lint +
> tests verdes, revisión visual del usuario, y commit en work-units (PRs ≤400 líneas).
> Regla vigente: **SOLO LECTURA contra SoftGuard** hasta decisión explícita del producto.

## Estado de partida (qué ya funciona)

- ACL `src/lib/softguard/api/` (core/monitoreo/crm/sertec/sistema) — 4 módulos integrados.
- Multimonitoreo en vivo en dashboard admin (poll 10 s, estado procesado/pendiente, reconexión).
- Proyección `sg_*` en `Cuenta` (fallo TST/AC, último evento) + columna "Panel" en /admin/cuentas.
- Los 3 jobs del cron (cuentas/eventos/OTs) corren por la API web.
- Panel de salud de módulos en /admin/sync-softguard.
- Design system Épica A casi cerrada (falta WU-6: 6 modales).

---

## Fase 0 — Consolidar antes de crecer (½ sesión) ⚠️ PRIMERO

El working tree acumula TODO lo anterior sin commitear: es el riesgo más grande hoy.

1. Revisión visual integral del usuario (`npm run dev`): dashboard, cuentas, sync-softguard,
   tipografía/shell. Ajustes finos que surjan.
2. Partir el working tree en **commits work-unit** revisables (design system / multimonitoreo
   / proyección cuentas / ACL / SerTec). No mezclar dominios en un commit.
3. Cerrar **WU-6** (6 modales → primitivo `Modal`, patrón documentado en PLAN-CONTINUACION)
   y declarar **Épica A terminada**.

**Criterio de cierre:** `git status` limpio, Épica A archivada, usuario aprobó visual.

## Fase 1 — Tests del ACL (½ sesión)

El ACL es ahora infraestructura crítica y tiene CERO tests. Los shapes reales ya están
capturados — convertirlos en fixtures.

1. Fixtures con filas reales (anonimizadas) de: ReporteHistoricoMM, EventosPendientes,
   CuentaByDealer, ServTec, DesktopModules.
2. Tests unitarios de los mapeos: normalización de fechas (US/ISO/sentinel 1900), `refCuenta`,
   criterio de cierre SerTec (estados 1,2,5,6), clasificación procesado/pendiente.
3. Test del retry de sesión en `restGet` (mock de fetch: HTTP 500 → relogin → ok).

**Ganancia:** los próximos módulos se integran sobre red de seguridad; los gotchas
descubiertos a mano quedan blindados contra regresiones.

## Fase 2 — Vista de operadores: /admin/monitoreo (1 sesión)

El multimonitor extendido que el usuario ya pidió ("para los operadores mostraremos una
visualización más extensa del mismo concepto").

1. Ruta `/admin/monitoreo` (acceso ADMIN + rol MONITOR si la policy lo permite):
   `MultiMonitorLive` con `limit={50}`, pantalla completa.
2. Filtros client-side: prioridad, solo pendientes, búsqueda por cuenta/titular.
3. Diferenciador real vs SoftGuard: cruce con datos del PORTAL (cuenta → cliente, teléfono,
   OTs abiertas de esa cuenta) en un panel lateral al seleccionar evento.
4. Opcional si sobra: aviso sonoro para prioridad 1 (respetando interacción previa del usuario).

**Ganancia:** los operadores trabajan sobre la fachada en vez de la suite — primer reemplazo
de pantalla completo.

## Fase 3 — Cerrar el ciclo de mantenimiento (1 sesión) ★ mayor ganancia metodológica

Hoy la proyección `sg_*` MUESTRA problemas; esta fase los convierte en TRABAJO ASIGNABLE.

1. **Detección → acción**: en `syncCuentasWebApi`, cuando una cuenta ENTRA en fallo
   (TST o AC sostenido >24 h, configurable), crear automáticamente una
   `SolicitudMantenimiento` (si no existe una abierta para esa cuenta) con el detalle del
   fallo. Eso la mete en el flujo existente: bandeja → asignación → OT → técnico.
2. Detalle de cuenta admin (`/admin/cuentas/[id]`): bloque "Panel" completo (situación,
   último test, fallo desde, último evento) — hoy solo está el badge en la lista.
3. Vincular OT ↔ SerTec: al ver una OT, si tiene `st_softguard_numero`, mostrar el estado
   real de la orden en la central (vencimiento `stf_dfecha_vto_orden` incluido).

**Ganancia:** un panel sin 220v deja de ser un dato que alguien tiene que mirar y pasa a ser
una solicitud que aparece sola en la bandeja del admin. ESTO es workflow, no dashboard.

## Fase 4 — La capa cliente (1 sesión) — meta de la visión

Exponer la información de la central a los clientes en su portal.

1. Dashboard del cliente: tarjeta "Estado de tu sistema" (panel reportando OK / con
   observaciones, último test) desde la proyección `sg_*` de SUS cuentas.
2. `/portal/eventos`: complementar con `EventoTimeLineFull` filtrado por su cuenta
   (requiere sondear los params del endpoint — está descubierto pero sin mapear).
3. Avisos en el portal cuando su panel está en fallo AC/TST ("tu sistema está corriendo a
   batería — agendá una visita"), enganchado a la solicitud de la Fase 3.

**Ganancia:** el cliente ve valor del servicio sin llamar; menos llamadas entrantes, más
confianza. Es la promesa de la visión cumplida de punta a punta.

## Fase 5 — Robustez transversal: Épica B (1-2 sesiones)

El plan original del design system, que ahora potencia todo lo anterior:

- Toasts globales (todas las acciones del flujo de Fase 3 confirman visualmente).
- `useOptimistic` en acciones frecuentes (procesar solicitud, asignar OT).
- Error boundaries por área + `not-found` consistentes (~62 rutas, hoy ~5).

## Fase 6 — Siguientes módulos del ACL (a demanda)

En orden de valor sugerido, con la receta documentada (captura → sonda → adaptador):

1. **CRM detalle de cuenta** (contactos, zonas, usuarios) — enriquece Fase 4.
2. **Video** — si los clientes tienen cámaras por la central, mostrarlas en su portal.
3. **SmartPanics** — botón de pánico móvil; potencial servicio nuevo para clientes.
4. Catálogos CRM (Geography, Tipos) para normalizar localidades/tipos del portal.

---

## Reglas de método (aprendidas en esta etapa, NO violar)

- DDL: `prisma db push` + `prisma generate` — NUNCA `migrate dev` (drift → pide RESET).
- No correr `sg-capture` en paralelo con la app (logins concurrentes pisan el OAuth).
- Shapes nuevos: validar SIEMPRE con datos reales antes de cablear (el "estado=2=CERRADA"
  del SQL era mentira; la verdad estaba en los params de la UI oficial).
- Todo fetcher nuevo entra por `api/<modulo>.ts` + export en `api/index.ts`; los consumidores
  jamás importan `core.ts`.
- Frenar a revisión visual del usuario antes de propagar cambios de UI.

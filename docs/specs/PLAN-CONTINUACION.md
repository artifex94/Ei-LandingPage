# Plan de Continuación — EI Design System (Épicas A→E)

> **NUEVA SESIÓN: EMPEZÁ ACÁ.** Si el usuario dice "continua", leé este archivo completo
> y seguí desde "Próximo paso inmediato". Spec maestro: `docs/specs/epica-a-design-system.md`.
> Última actualización: 2026-06-11.

## Contexto en 30 segundos

ERP de Escobar Instalaciones (Next 16, React 19, Tailwind 4, Radix, Prisma, Supabase).
Se está construyendo un **design system** por épicas, en work-units revisables (PRs ≤400 líneas).
El usuario revisa visualmente cada lote con `npm run dev` antes de avanzar. **No commitear sin
que lo pida.** Todo el trabajo actual está en working tree, sin commitear.

## Reglas de trabajo (acordadas con el usuario)

- Verificar SIEMPRE: `npx tsc --noEmit`, `npx eslint <archivos>`, `npm run test:unit`.
- No puedo levantar el dev server acá (necesita DB/Supabase/auth) → el usuario hace la
  revisión visual. Por eso se trabaja en lotes y se frena a revisar antes de propagar.
- Preservar comportamiento; las armonizaciones visuales (header canónico, EmptyState, etc.)
  ya están aprobadas por el usuario.
- No forzar `DataTable` en tablas que no son listas de datos uniformes (ver exclusiones).

## Estado actual: ÉPICA A — casi cerrada

**Hecho y verde (tsc + lint + 25 tests unitarios):**

- **Primitivas** en `src/components/ui/`: `Badge`, `Card`, `EmptyState`, `FormField`/`Label`,
  `DataTable`, `Modal`, `Pagination` + `cn` (`src/lib/ui/cn.ts`).
- `DataTable` soporta: columnas tipadas, `caption` a11y, loading skeleton, `emptyState`,
  `renderCard` (tabla desktop / tarjetas mobile), `rowClassName` (resaltado por fila),
  `onRowClick`.
- **Doc viva**: `/admin/ui-kit` (smoke-test de todas las primitivas).
- **Tests**: Vitest + Testing Library + jsdom (`npm run test:unit`). Config en
  `vitest.config.ts` + `vitest.setup.ts` (mock de `next/link`).
- **WU-4 (tablas) COMPLETO**: 18 tablas migradas a `DataTable`. Cero `<table>` cruda en `src`
  salvo `DataTable` y 4 exclusiones documentadas (`CalendarioTurnos`, `GestionSensores`,
  `higienizar`, `recibo/[id]`).
- **WU-6 (modales) COMPLETO (2026-06-11)**: 9/9 migrados. Cero `@radix-ui/react-dialog`
  directo fuera de `src/components/ui/Modal.tsx` (chequeable con `rg -l`). El primitivo
  se extendió de forma backward-compatible para cubrir el paywall:
  - `dismissible={false}` → sin botón ✕, Escape y click-afuera bloqueados, `onClose`
    no se acepta (union discriminada). Usado por `PagoRequeridoModal` — migrarlo sin
    esto habría dejado cerrar el modal de suspensión con Escape (bug).
  - `titleHidden` → `Dialog.Title` queda `sr-only`; el modal dibuja su header propio
    en children (paywall: ícono + título centrado `font-display`).
  - `className` → clases extra en el Content (paywall: `border-red-800`).
  - Tests: 6 en `Modal.test.tsx` (28/28 del suite verde).
  Cambios visuales a validar en la revisión: paywall pierde `backdrop-blur` y pasa a
  fondo `slate-800` (caja deuda y botón sesión subidos a `slate-700`); inputs de los
  4 formularios migrados suben de `slate-800` a `slate-700`; headers armonizados al
  estilo del primitivo (`text-xl font-bold`).

## Frente activo: modernización del shell + área Mi Central (portal)

Trabajo en working tree (sin commitear, junto con lo de abajo). **Pendiente de revisión
visual del usuario** antes de seguir propagando:

- **Tipografía display**: `Chakra_Petch` via next/font (`--font-chakra` → `font-display` en
  `globals.css`). Aplicada a: marca (login, PortalNav, AdminSidebar `BrandBlock`, layout
  técnico), títulos h1 de dashboards (admin/portal/mi-día), ui-kit (sección "Tipografía"),
  y **todos los h1 del portal** (16 páginas: pagos, facturas, recibos, eventos, perfil,
  solicitudes, soporte, ot, documentos, mis-turnos, turno-actual, cuentas/[id], etc.).
- **globals.css base**: `color-scheme: dark`, scrollbars finos, `::selection` naranja,
  `touch-action: manipulation`, sin tap-highlight.
- **AdminSidebar**: `BrandBlock` + `SidebarFooter` (avatar con inicial), Escape cierra drawer,
  `overscroll-contain`, colores `industrial-*`, targets táctiles 44px.
- **Layout técnico**: header + tab nav en un solo bloque sticky (sin `top-[57px]` mágico).
- **Emojis → lucide** en portal: accesos rápidos del dashboard, `PagoRequeridoModal`
  (AlertTriangle/CreditCard/MessageCircle/LogOut), banda de dispositivos en `cuentas/[id]`
  (BatteryWarning/BatteryLow/Wrench). Los **glifos monocromos** (✓ ✕ ⚠ ○ ↻ ◎) se conservan:
  son estética industrial deliberada (debate glifo-vs-lucide sigue abierto, ver
  "Optimizaciones opcionales").
- Dashboard admin: `<a>` → `<Link>` y unused vars arreglados (era deuda lint preexistente).
- **Panel Multimonitoreo en dashboard admin** (pedido del usuario, 2026-06-10):
  `src/components/admin/MultiMonitorLive.tsx` (client, polling 15 s, pausa con pestaña
  oculta, flash naranja en eventos nuevos, prioridad 1=rojo/2=ámbar) +
  `GET /api/admin/eventos-live` (cola EventosPendientes vía API web :8080 → "EN VIVO";
  fallback a EventoAlarma de la DB → "DIFERIDO"; auth ADMIN). No persiste eventos — eso
  sigue siendo del cron. Pendiente de revisión visual.
  **DATOS OK (2026-06-10 tarde)**: tras asignar línea ESI + módulo "Monitoreo Web Remoto" al
  usuario web, los eventos fluyen. La fuente del endpoint ahora es `fetchEventosHistoricoMM()`
  (misma query que la grilla oficial; trae descripción legible sin catálogo). Bugfix incluido:
  `softguard_ref` se compone `linea-cuenta` ("ESI-0175") vía `refCuenta()` — antes el match
  con `Cuenta.softguard_ref` fallaba. **Regla del usuario: SOLO LECTURA contra SoftGuard**
  (no atender/procesar eventos vía API; eso es manual en su módulo, se implementará después).
  Sonda de diagnóstico: `scripts/sg-probe-eventos.mjs`. Verificado contra API real: eventos
  ESI-0175 Apertura/Cierre normalizados. Pendiente: revisión visual del panel con datos.
  **v2 del panel (mismo día)**: poll 10 s; `?limit=` en el endpoint (clamp 5–100, dashboard
  pide 12); estado **procesado/pendiente por evento** cruzando ReporteHistoricoMM ×
  EventosPendientes por `rec_iid` (verificado: 19/100 matches reales — COF/LOW sin atender).
  Próximo (pedido del usuario): **vista extensa para operadores de monitoreo** reutilizando
  `MultiMonitorLive` con límite mayor (el endpoint ya lo soporta).
  **v3 — reorganización del dashboard (aprobada por el usuario)**: zonas por modo de lectura —
  negocio (alerta + 3 métricas) / operación en vivo (grid 2 col: `MultiMonitorLive limit={8}`
  sin scroll interno + Central de monitoreo con cobertura-hoy fusionada adentro) / Técnicos en
  campo full-width (cards en grid 2 col xl). La **alerta única y el Ops Score** ahora usan la
  cola viva (`fetchEventosPendientes` con `Promise.race` 4 s → fallback al conteo del cron) —
  una sola fuente de verdad con el panel. Tutorial actualizado (4 pasos). Pendiente revisión
  visual.
  **v4 — resiliencia de sesión** (la central tiene mantenimientos/microcortes): `restGet`
  ahora invalida la cookie y reintenta UNA vez con login fresco ante HTTP de error o no-JSON
  (antes una cookie muerta quedaba cacheada hasta 25 min y el panel quedaba trabado);
  `?relogin=1` fuerza login nuevo (`invalidateWebApiSession()`); el panel tiene botón ↻ de
  reconexión manual y campo `degradado` en la respuesta → badge "SIN CONEXIÓN" aun mostrando
  lo último sincronizado de la DB.
  **Visión del usuario (norte del producto)**: el portal admin como FACHADA moderna sobre la
  suite web SoftGuard (anti-corruption layer en `web-api.ts`); próximos módulos: CRM y otros;
  todo SOLO LECTURA hasta nuevo aviso; meta final: exponer la información a los clientes.
  Ver memoria `vision-fachada-softguard`.
  **v5 — salud de módulos + CRM inspeccionado**: `SoftGuardModulosPanel` en
  `/admin/sync-softguard` + `GET /api/admin/softguard-status` (sesión, 5 sondas con latencia,
  DesktopModules con disponibilidad, conteo de cuentas como chequeo de permisos).
  `sg-capture.mjs` ahora acepta el módulo por argv. CRM (`WebCRM`) habilitado y capturado:
  `CuentaByDealer` sin filtros → 203 cuentas completas con estado de test (`sta_*`) —
  candidata a reemplazar `syncCuentas` (SQL bloqueado). Catálogos: Tipos, Geography,
  PlantillasSms, ListasEmergencia, TGEquipos. Falta capturar el DETALLE de cuenta
  (contactos/zonas/usuarios) navegando una cuenta en la UI del CRM.
  **v6 — puente CRM→portal (proyección de cuentas) HECHO**: campos `sg_*` en `Cuenta`
  (situación, fallo TST, último test, fallo AC, último evento, synced_at) aplicados con
  `prisma db push` — ⚠️ NO usar `migrate dev`: detecta drift y pide RESET (borraría datos);
  el proyecto convive con drift, usar db push para DDL aditivo. `fetchCuentasDealer()` en
  web-api + `syncCuentasWebApi()` en sync.ts (no blanquea dirección cargada a mano) cableado
  al cron. Primer sync real: 184 actualizadas / 19 sinMatch (internas _SG) / 0 errores;
  hallazgo: 29 cuentas con fallo de AC. Columna "Panel" (OK / Sin 220v / Sin reportar) en
  `/admin/cuentas` (tabla + card mobile, tooltip con último evento). Pendiente: mostrar la
  proyección en el detalle de cuenta admin y en el portal del cliente; capturar detalle CRM.
  **v7 — ACL formalizado (goal del usuario, CUMPLIDO)**: `src/lib/softguard/api/` con
  `core.ts` (transporte: login, restGet con retry, normalización), `monitoreo.ts`, `crm.ts`,
  `sistema.ts`, `index.ts` (barrel con la receta de extensión); `web-api.ts` quedó como shim
  de compatibilidad (`export * from "./api"`) — cero imports rotos. Inventario de los 26
  módulos + endpoints validados + gotchas + receta documentados en
  `docs/integracion-softguard.md` §"Camino activo". Smoke en vivo: los 3 adaptadores OK.
  Gotcha: logins concurrentes del mismo usuario pisan el handshake OAuth (no correr
  sg-capture en paralelo con la app).
  **v8 — SerTec integrado (módulo habilitado por el usuario)**: el ícono del Desktop se llama
  "Servicio Técnico" (no "SerTec" — por eso fallaba la captura). `api/sertec.ts`:
  `fetchOrdenesServicio` / `fetchOrdenesServicioCount` (GET /Rest/search/ServTec, modelo
  `stc_*`). **Criterio de cierre EMPÍRICO**: la UI filtra activas con `stc_nestado in
  (1,2,5,6)`; cerrada = estado fuera del set + `stc_dfecha_cierre` válida — el "estado=2 =
  CERRADA" del pipeline SQL era INCORRECTO (nunca validado). `syncEstadoOTWebApi()` cableado
  al cron → los TRES jobs (cuentas/eventos/OTs) corren por la API web; el pipeline SQL quedó
  solo como fallback si algún día abren el 1433. Sonda SerTec en el panel de salud; módulos
  "en uso": WebRemoto + WebCRM + SerTec. Verificado en vivo: orden #1 estado=4 → cerrada=true.
  Fix hidratación: classNames multilínea normalizados en `AdminSidebar` y `tecnico/layout`
  (el patrón multilínea en client components causa hydration mismatch; en RSC es inocuo).

## Próximo paso inmediato → `docs/specs/plan-iteracion-fachada.md` (Fase 2)

> **2026-06-11 (tarde)**: Fase 0 CERRADA (usuario aprobó visual; 7 commits work-unit
> ejecutados; **ÉPICA A TERMINADA**). Además:
>
> - **Pipeline SQL (1433) RETIRADO** por decisión del usuario: borrados `client.ts`,
>   `queries.ts`, `schema.ts`, el shim `web-api.ts`, `SoftGuardSyncStatus` + endpoint
>   ping, seeds SQL y deps `mssql`. Los consumidores importan SIEMPRE de
>   `@/lib/softguard/api`. Vars `SOFTGUARD_DB_*`/`SOFTGUARD_MOCK` sin efecto (limpiar
>   de `.env.local`/producción cuando se pueda). Commit `78264ac` (-1968 líneas).
> - **Fase 1 HECHA**: 36 tests del ACL con fixtures fieles al contrato real
>   (`src/lib/softguard/api/*.test.ts` + `fixtures.ts`). Suite total: 64/64.
>
> **Fase 2 CERRADA (2026-06-11, aprobada visualmente por el usuario):**
>
> - `src/components/admin/eventos-live.ts`: hook `useEventosLive` compartido entre el
>   panel del dashboard y la vista de operadores + `filtrarEventos` puro (con tests) +
>   formato de hora FIJO 24 h sin locale (toLocaleTimeString varía según el ICU del
>   runtime — gotcha real detectado por los tests).
> - `/admin/monitoreo` (`MonitorOperadores`): 50 eventos pantalla completa, filtros
>   (búsqueda cuenta/titular, prioridad P1/P2/resto, solo pendientes), panel lateral
>   al seleccionar evento con contexto del PORTAL vía `GET /api/admin/cuenta-contexto`
>   (cliente + teléfono click-to-call, proyección sg_* del panel, OTs y solicitudes
>   abiertas, link al detalle de cuenta). Cache por ref en el cliente.
> - Sidebar: ítem "En vivo" primero en la sección Monitoreo. El panel del dashboard
>   linkea "Vista operadores →" (/admin/eventos sigue en el sidebar).
> - Pendiente opcional de la fase (punto 4 del plan): aviso sonoro para P1.
>
> **Fase 3 CERRADA (2026-06-11, aprobada por el usuario; 88/88 tests):**
>
> - **Detección → acción**: `sg_fallo_ac_desde` nuevo en Cuenta (db push aplicado;
>   la central solo da el bool de AC, el "desde" se deriva en el sync). Lógica pura
>   en `src/lib/softguard/fallo-sostenido.ts` (16 tests): fallo TST o AC sostenido
>   > umbral (`SOFTGUARD_FALLO_SOSTENIDO_HORAS`, default 24 h) → crea
>   `SolicitudMantenimiento` prioridad ALTA con prefijo `[AUTO]`. Dedupe: no crea si
>   hay solicitud abierta o una [AUTO] de las últimas 48 h (cooldown
>   `COOLDOWN_AUTO_MS` en sync.ts). `syncCuentasWebApi` pasó de updateMany a lectura
>   de estado previo + update por id; reporta `solicitudesCreadas` (visible en el
>   log del cron como `cuentas.solicitudesAuto`).
>   ⚠ Al deployar: las cuentas con fallo TST viejo (la central informa el desde)
>   generan su [AUTO] en el PRIMER sync; las ~29 con fallo AC arrancan reloj y
>   generan en tanda ~24 h después si persisten. Es el comportamiento esperado.
> - **Bloque "Panel — central de monitoreo"** en `/admin/cuentas/[id]`: situación,
>   alimentación (con desde), test periódico (con desde y último test), último
>   evento, pie con synced_at. El panel de operadores también muestra ahora el
>   "desde" del fallo de AC.
> - **OT ↔ SerTec**: `EstadoSerTecCard` (RSC async en Suspense) en `/admin/ot/[id]`
>   cuando hay `st_softguard_numero`: abierta/cerrada real en la central,
>   vencimiento (resaltado VENCIDA), técnico y observaciones. Match por número en
>   memoria (sin filtros del API no validados); si la central no responde, degrada
>   a aviso sin romper la página.
>
> **Fase 4 IMPLEMENTADA en sus puntos 1 y 3 (2026-06-11, madrugada) — en working
> tree, PENDIENTE de revisión visual del usuario (88/88 tests, tsc/lint verdes):**
>
> - **`EstadoSistemaCard`** en el dashboard del cliente (arriba de las CuentaCards;
>   solo aparece si alguna cuenta tiene `sg_synced_at`): todas OK → "reportando con
>   normalidad" + último test; fallo → aviso en lenguaje del cliente («X» está
>   funcionando a batería / no se está reportando, con el desde) y el **enganche
>   F3**: si la cuenta tiene solicitud u OT abierta → badge "Visita técnica en
>   gestión"; si no → CTA "Solicitar visita técnica" (/portal/solicitud). LED
>   emerald/amber/red según severidad, estética industrial del portal.
> - **Punto 2 (EventoTimeLineFull) NO cableado aún**: el endpoint está descubierto
>   pero sin mapear el filtro por cuenta. Sonda lista: con la app y el cron
>   APAGADOS correr `node --env-file=.env.local scripts/sg-probe-timeline.mjs 0175
>   ESI` — prueba 6 variantes de filtrado y dice cuál funciona. Con el shape
>   validado: adaptador en `api/monitoreo.ts` + fixture + test + sección en
>   /portal/eventos.
>
> Con el OK visual → commit work-unit de la Fase 4 (parcial). Quedan: punto 2 tras
> la sonda, aviso sonoro P1 (opcional F2), y **Fase 5 = Épica B** (toasts,
> optimistic, error boundaries).
>
> Deuda menor detectada (no bloquea): el badge "configurado/no configurado" de
> `ConfiguracionForm` lee `process.env` en un client component → para vars server-only
> siempre muestra "no configurado" (preexistente; arreglarlo implica pasar el estado
> desde un server component).

## ÉPICA B (Fase 5) — estado real al 2026-06-11

- **RF-B1 HECHO (en working tree, pendiente revisión visual)**: sistema de toasts
  global. `src/components/ui/Toast.tsx` (`ToastProvider` montado en el layout raíz +
  `useToast()`; variantes success/error, apilables, swipe, cierre accesible, animación
  `animate-toast-in` en globals). Demo en /admin/ui-kit, 3 tests. **Criterio del DS:
  validación de campos → inline junto al campo; resultado de la operación → toast.**
  Adoptado en el flujo de la Fase 3: `CambiarEstadoOTButtons` (antes se tragaba los
  errores en silencio), `AsignarTecnicoForm` y `AccionesForm` de mantenimiento (ídem
  con `.catch(console.error)`). El resto de las Server Actions se migra a demanda
  con el mismo patrón.
- **RF-B3/B4 YA CUBIERTOS (descubrimiento de esta sesión)**: las TRES áreas tienen
  `error.tsx` (con reset + digest) y `not-found.tsx` a nivel segmento — en App Router
  eso cubre todas las rutas hijas; el "~5 de ~62" del feedback original contaba por
  ruta, innecesario. No hay trabajo acá.
- **RF-B2 PENDIENTE (próximo work-unit)**: `useOptimistic` en acciones frecuentes.
  OJO análisis previo: solo aporta donde el estado visible vive en un CLIENT component
  (p. ej. KanbanBoard de mantenimiento); en los detalles RSC (badge de estado de OT)
  el dato vive en el server component padre y useOptimistic no llega — habría que
  mover estado a client primero. Evaluar caso por caso antes de tocar.

Luego **Épica C** (filtros por URL, bulk actions, command palette), **D** (a11y axe, mobile
técnico, reduced-motion), **E** (pulido dashboard, estados con personalidad). Ver
`epica-a-design-system.md` §3 "Fuera de alcance".

## Optimizaciones opcionales detectadas (revisión total Épica A)

Bajo impacto; hacer solo si el usuario lo pide o sobra tiempo:

- `EventoEstadoBadge` y `EmptyStateSuccess` aún NO usan las primitivas `Badge`/`EmptyState`.
  Reconciliarlos consolidaría más, pero hay leve riesgo de drift visual (colores indigo/slate
  en EventoEstadoBadge no mapean exacto a variantes; glyph ✓ vs ícono lucide en
  EmptyStateSuccess). Requiere revisión visual.
- `cn` no usa `tailwind-merge` (decisión consciente, sin dependencia). Reevaluar solo si algún
  override de clases da conflicto real.

## Deuda preexistente (NO es de esta épica, no romper el alcance)

Lint del repo tiene 5 problemas previos en archivos NO tocados por el DS:
`src/components/admin/TutorialContextual.tsx` (setState-in-effect, error),
`src/app/admin/mantenimiento/page.tsx` (unused var),
`src/app/admin/dashboard/page.tsx` (unused vars + `<a>`→`<Link>`). Mencionar al usuario; no
arreglar dentro del scope del DS salvo que lo pida.

## Verificación rápida al retomar

```bash
npx tsc --noEmit          # debe pasar
npm run test:unit         # 25/25 verde
grep -rln "<table" src    # solo DataTable.tsx + 4 exclusiones
```

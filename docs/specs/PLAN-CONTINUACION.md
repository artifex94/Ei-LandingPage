# Plan de Continuación — EI Design System (Épicas A→E)

> **NUEVA SESIÓN: EMPEZÁ ACÁ.** Si el usuario dice "continua", leé este archivo completo
> y seguí desde "Próximo paso inmediato". Spec maestro: `docs/specs/epica-a-design-system.md`.
> Última actualización: 2026-06-10.

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
- **WU-6 (modales) parcial**: 3/9 hechos — `PagoModal`, `ModalSubirPdf`, `ModalPrepararArca`.

## Próximo paso inmediato → cerrar WU-6 (Épica A)

Adoptar el primitivo `Modal` (`src/components/ui/Modal.tsx`) en los **6 modales restantes**
que aún usan `@radix-ui/react-dialog` directo:

1. `src/components/portal/PagoTotalModal.tsx`        (portal, cara al cliente)
2. `src/components/portal/PagoRequeridoModal.tsx`    (portal)
3. `src/components/portal/SolicitarOTButton.tsx`     (patrón Dialog.Trigger → necesita `useState(open)`)
4. `src/components/admin/ot/NuevaOTButton.tsx`        (patrón Dialog.Trigger)
5. `src/components/admin/vehiculo/NuevaReservaDialog.tsx` (patrón Dialog.Trigger)
6. `src/components/admin/empleados/NuevoEmpleadoDialog.tsx` (patrón Dialog.Trigger)

**Cómo migrar (patrón ya aplicado 3 veces):**
- Reemplazar `Dialog.Root/Portal/Overlay/Content/Title/Description/Close` por
  `<Modal open onClose title description size>`. `size`: `md` (max-w-md) / `lg` (max-w-lg).
- Los 4 con `Dialog.Trigger` (botón que abre): agregar `const [open, setOpen] = useState(false)`,
  dejar el botón disparador con `onClick={() => setOpen(true)}` y envolver el contenido en
  `<Modal open={open} onClose={() => setOpen(false)} …>`.
- **Cuidado de contraste**: el `Modal` tiene fondo `bg-slate-800`. Si el modal original era
  `bg-slate-900` con inputs/`pre` en `bg-slate-800`, subí esos a `bg-slate-700` / `bg-slate-900`
  para no perder contraste (así se hizo en `ModalSubirPdf` y `ModalPrepararArca`).
- Botones "Cancelar" que usaban `Dialog.Close` → cambiar a `onClick={onClose}` (o `setOpen(false)`).
- Verificar tsc + lint + `npm run test:unit`. Frenar y pedir revisión visual del usuario antes
  de dar Épica A por cerrada (estos modales son cara-al-cliente y admin críticos).

## Después: ÉPICA B (toasts, optimistic, error boundaries)

Próxima épica grande una vez cerrada A. Resumen (detalle en el feedback original):

- **RF-B1**: Sistema de **toasts global** con `@radix-ui/react-toast` (ya instalado, usado en 1
  solo lugar). Provider en el layout raíz; toda Server Action devuelve éxito/error visible.
- **RF-B2**: **Optimistic UI** con `useOptimistic` (React 19) en acciones frecuentes
  (marcar OT, aprobar solicitud, cambiar estado).
- **RF-B3**: **Error boundaries** por área — `error.tsx` en cada segmento de `admin/`,
  `portal/`, `tecnico/` (hoy solo ~5 de ~62 rutas). Con reintento.
- **RF-B4**: `not-found.tsx` consistentes en rutas `[id]`.

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

# Épica A — Consolidación del Design System

> Estado: **EN PROGRESO**
> Autor: Equipo EI · Fecha: 2026-06-09
> Prioridad: ALTA — fundación de las épicas B→E

## 1. Contexto y problema

El proyecto tiene un **sistema de _tokens_ maduro** (`industrial`/`tactical`, animaciones LED,
curvas mecánicas en `globals.css`) pero **no tiene un sistema de _componentes_**. Evidencia
medida sobre el código actual:

- `src/components/ui/` contiene solo **5 primitivas** (`Button`, `Input`, `Select`,
  `Textarea`, `LogoutButton`) para un ERP de **62 páginas** y **58 componentes admin**.
- Hay **23 `<table>` crudas** repartidas por features (`EmpleadosTable`, `AusenciasTable`, …),
  cada una reimplementando header/borde/hover/empty-state.
- El patrón _badge_ (`bg-X-500/20 text-X-300 rounded-full`) está duplicado en al menos
  `EventoEstadoBadge`, `EmpleadosTable` (ROL_BADGE) y otros.
- Conviven **dos vocabularios de color**: los tokens `tactical/industrial` y el `slate/orange`
  crudo. La consistencia hoy depende de copiar bien, no de reusar.
- No existe helper `cn`/clsx, ni `Card`/`Badge`/`Modal`/`EmptyState`/`Pagination` genéricos
  (solo `EmptyStateSuccess`, de un caso particular).

**Consecuencia:** cada feature nueva multiplica la inconsistencia y el costo de cambio. Las
épicas B (toasts/optimistic), C (filtros/bulk), D (a11y) y E (pulido) **no se pueden construir
de forma consistente** sin esta base.

## 2. Objetivo

Crear una capa de **primitivas reutilizables** en `src/components/ui/` que consolide los
patrones duplicados, unifique el vocabulario visual sobre los tokens existentes, y se convierta
en la única fuente de verdad para tablas, tarjetas, badges, formularios, modales y estados
vacíos. **Sin regresiones visuales ni de comportamiento** en las pantallas ya existentes.

## 3. Alcance

### Dentro de alcance (RF)

| ID | Componente | Reemplaza / consolida |
|----|------------|------------------------|
| **RF-A0** | `cn()` util (`src/lib/ui/cn.ts`) | Concatenación manual de clases |
| **RF-A1** | `<Badge>` con variantes por estado | `EventoEstadoBadge`, ROL_BADGE, badges inline |
| **RF-A2** | `<Card>` / `<CardHeader>` / `<CardBody>` | `rounded-lg border border-slate-700` repetido |
| **RF-A3** | `<EmptyState>` genérico (+ variante success) | Empty-states inline de las 23 tablas |
| **RF-A4** | `<Label>` / `<FormField>` | Labels sueltos sin `htmlFor` consistente |
| **RF-A5** | `<DataTable>` tipado | Las 23 `<table>` crudas |
| **RF-A6** | `<Modal>` (wrapper Radix Dialog) | `PagoModal`, `ModalSubirPdf`, `ModalPrepararArca`, … |
| **RF-A7** | `<Pagination>` | Paginación inexistente / ad-hoc |
| **RF-A8** | Página interna `/admin/ui-kit` | Documentación viva del DS |
| **RF-A9** | Migración incremental de consumidores | 23 tablas + badges + empty-states |

### Fuera de alcance (épicas posteriores)

- Toasts globales, optimistic UI, error boundaries → **Épica B**.
- Filtros por URL, bulk actions, command palette → **Épica C**.
- Auditoría a11y sistemática, mobile técnico, reduced-motion → **Épica D**.
- Pulido visual de dashboard / estados con ilustración → **Épica E**.

## 4. Requisitos funcionales detallados

### RF-A0 — `cn()`
- Función pura sin dependencias: une `ClassValue[]` filtrando _falsy_.
- Ubicación: `src/lib/ui/cn.ts`. Export nombrado `cn`.
- **Decisión:** no se agrega `tailwind-merge` en esta fase (evita dependencia y mantiene el
  slice de riesgo cero). Se reevalúa en RF-A5 si los overrides de tabla lo exigen.

### RF-A1 — `<Badge>`
- Props: `variant` (`neutral | info | success | warning | danger | brand`), `size` (`sm | md`),
  `className`, `children`.
- Mapea variantes a las clases `bg-X-500/20 text-X-300` ya usadas en el código.
- `EventoEstadoBadge` pasa a ser un _wrapper_ fino sobre `<Badge>` (mantiene su mapa de estados).

### RF-A2 — `<Card>`
- `<Card>` (contenedor `rounded-lg border border-slate-700 bg-slate-800/…`), `<CardHeader>`,
  `<CardBody>`, `<CardFooter>`. Acepta `as`/`className`.

### RF-A3 — `<EmptyState>`
- Props: `icon?`, `title`, `description?`, `action?` (`{ label, href | onClick }`),
  `tone` (`neutral | success`). `EmptyStateSuccess` queda como preset de `<EmptyState tone="success">`.

### RF-A4 — `<Label>` / `<FormField>`
- `<FormField>` compone `Label + control + error`, vincula `htmlFor`/`id` y `aria-describedby`.
- Integra con `Input`/`Select`/`Textarea` existentes (que ya exponen `error`).

### RF-A5 — `<DataTable<T>>`
- Genérico tipado. Props: `columns: Column<T>[]`, `rows: T[]`, `keyExtractor`,
  `emptyState`, `isLoading`, `caption`.
- `Column<T>`: `{ id, header, cell: (row) => ReactNode, align?, className?, srOnlyHeader? }`.
- A11y: `<table>` con `<caption>` (sr-only si hace falta), `scope="col"`, `divide-y`.
- Responsive: en `< md`, render alternativo en _cards_ (modo `stack`) — configurable.
- Mantiene el look actual (header `bg-slate-800`, hover `bg-slate-800/50`).

### RF-A6 — `<Modal>`
- Wrapper sobre `@radix-ui/react-dialog` extrayendo el patrón de `PagoModal`:
  overlay `bg-black/70`, content centrado `rounded-2xl`, botón cerrar accesible (44px,
  `sr-only` label), `aria-describedby`, scroll interno `max-h-[90vh]`.
- Props: `open`, `onClose`, `title`, `description?`, `size` (`sm | md | lg`), `children`.

### RF-A7 — `<Pagination>`
- Controlada por `searchParams` (server-friendly). Props: `page`, `pageCount`, `makeHref`.
- A11y: `nav[aria-label]`, `aria-current="page"`, targets 44px.

### RF-A8 — `/admin/ui-kit`
- Página `noindex` que renderiza cada primitiva con sus variantes y estados (incluye LED y
  curvas mecánicas). Sirve de documentación viva y _smoke test_ visual.

### RF-A9 — Migración
- Migrar consumidores **por work-unit**, empezando por los de mayor duplicación.
- Cada migración: sin cambio de comportamiento, validada por la suite Playwright existente.

## 5. Criterios de aceptación

1. `tsc --noEmit` y `next build` pasan sin errores nuevos.
2. `npm run lint` sin warnings nuevos.
3. `npm run test` (Playwright) y `npm run test:a11y` (axe) verdes — sin regresiones.
4. Las primitivas viven en `src/components/ui/` con export consistente.
5. `EventoEstadoBadge` y `EmptyStateSuccess` reimplementados sobre las primitivas, sin cambio
   visual perceptible.
6. Al menos las 23 `<table>` crudas migradas a `<DataTable>` (RF-A9), o documentado el residual.
7. `/admin/ui-kit` lista todas las primitivas con sus variantes.

## 6. Estrategia de testing

- **Vitest + Testing Library + jsdom** ya instalados (WU-5). Script: `npm run test:unit`.
  Config en `vitest.config.ts`, setup en `vitest.setup.ts` (mock de `next/link`, matchers
  jest-dom). 23 tests cubren `Badge`, `Card`, `EmptyState`, `FormField`, `DataTable`,
  `Pagination`, `Modal`.
- Playwright e2e + `@axe-core/playwright` siguen para flujos y a11y de páginas reales.
- Cada migración de WU-4 se valida con: `test:unit` + `tsc` + `lint` + revisión visual
  (dev server) por no poder levantar la app en CI-sandbox.

## 7. Plan de ejecución (work-units / PRs ≤400 líneas)

| WU | Contenido | Riesgo | Estado |
|----|-----------|--------|--------|
| **WU-1** | `cn` + `Badge` + `Card` + `EmptyState` + `Label/FormField` (leaf, sin migración) | Muy bajo | ✅ hecho (tsc+lint) |
| **WU-2** | `Modal` (extraído de PagoModal) | Bajo | ✅ hecho (tsc+lint) |
| **WU-3** | `DataTable` + `Pagination` + página `/admin/ui-kit` | Medio | ✅ hecho (tsc+lint) |
| **WU-3b** | Migración piloto `EmpleadosTable` → `DataTable` (prueba de integración) | Bajo | ✅ hecho (tsc+lint) |
| **WU-5** | Vitest + Testing Library + 25 tests unitarios de primitivas | Bajo | ✅ hecho (25/25 verde) |
| **WU-4** | Migración de todas las tablas de datos + badges/empty-states | Medio | ✅ completo (18 tablas, tsc+lint+unit) |
| ↳ WU-4.1 | `clientes`, `cuentas`, `ot`, `eventos`, `pagos` → `DataTable` (+ `renderCard`/`rowClassName`/`Pagination`) | Medio | ✅ hecho |
| ↳ WU-4.2 | facturación ×3, `AusenciasTable` (badges→`Badge`), `ReservasVehiculo`, detalle de cuenta | Medio | ✅ hecho |
| ↳ WU-4.3 | admin (`auditoria`, `tecnicos`, `solicitudes-alta`) + portal (`recibos`, `facturas`, `documentos`, `perfil`) | Medio | ✅ hecho |

Tras WU-4 no queda ninguna `<table>` cruda en `src` salvo el propio `DataTable` y las 4
exclusiones documentadas abajo.

### Exclusiones de `DataTable` (decisión arquitectónica)

Cuatro `<table>` NO se migran porque exceden el contrato de `DataTable` (filas uniformes
presentacionales). Forzarlas degradaría la funcionalidad:

- **`CalendarioTurnos`**: matriz de calendario (franjas × días con celdas interactivas de
  asignación). Es un pivot/scheduling grid, no una lista de registros.
- **`GestionSensores`**: grilla con edición inline — las filas mutan a un formulario con
  `colSpan`. Necesitaría un row-renderer custom que rompe la uniformidad de la primitiva.
- **`higienizar`**: flujo de selección masiva (click-en-fila togglea, checkbox atado al estado
  del padre por índice) sobre una operación destructiva sin deshacer; requiere `min-width` de
  scroll que la primitiva no expone. Riesgo alto, beneficio bajo.
- **`recibo/[id]`**: comprobante imprimible — tema claro, estilos `print:`, `tfoot` con total
  y sello "PAGADO". Es un documento de impresión, no una lista de datos del panel oscuro.
| **WU-6** | Adopción de `Modal` en modales existentes | Bajo | 🔄 3/9 (PagoModal, ModalSubirPdf, ModalPrepararArca) |
| ↳ WU-6 residual | 6 modales con `Dialog` crudo restantes (ver Plan de Continuación) | Bajo | ⏳ pendiente |

## 8. Riesgos y mitigaciones

- **Regresión visual silenciosa** → migrar por lotes chicos + revisión + `/admin/ui-kit` como
  referencia + suite Playwright.
- **Sobre-abstracción del `DataTable`** → API mínima guiada por los casos reales de las 23 tablas;
  no agregar features especulativas (orden/selección llegan con la Épica C).
- **Doble vocabulario de color** → las primitivas fijan el mapa canónico; la migración lo propaga.

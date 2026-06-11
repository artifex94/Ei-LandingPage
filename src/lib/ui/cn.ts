export type ClassValue = string | number | null | false | undefined;

/**
 * Une clases de Tailwind filtrando valores falsy. Mínimo y sin dependencias.
 *
 * No resuelve conflictos de Tailwind (eso lo haría `tailwind-merge`); para los
 * patrones `${base} ${className}` del proyecto alcanza. Si en RF-A5 los overrides
 * de tabla lo exigen, se reevalúa sumar `tailwind-merge`.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

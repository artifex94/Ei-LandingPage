import type { ReactNode } from "react";

export interface PortalPageHeaderProps {
  /** Etiqueta técnica superior en mayúsculas (opcional). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Slot a la derecha del título (filtros, CTA). */
  action?: ReactNode;
  /** id para aria-labelledby de la sección que encabeza. */
  titleId?: string;
}

/**
 * Encabezado de página del portal del cliente. Consolida el bloque
 * H1 + descripción + acción repetido en todas las páginas (dialecto cliente).
 */
export function PortalPageHeader({
  eyebrow,
  title,
  description,
  action,
  titleId,
}: PortalPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-tactical-400">
            {eyebrow}
          </p>
        )}
        <h1
          id={titleId}
          className="text-3xl font-display font-black tracking-tight text-white sm:text-4xl"
        >
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

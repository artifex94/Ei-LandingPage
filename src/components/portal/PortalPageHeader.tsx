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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            {eyebrow}
          </p>
        )}
        <h1
          id={titleId}
          className="text-2xl font-display font-bold tracking-tight text-white"
        >
          {title}
        </h1>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

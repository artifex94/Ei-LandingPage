import type { ReactNode } from "react";

export interface PortalSectionProps {
  title: string;
  /** id del heading para aria-labelledby. */
  titleId?: string;
  /** Color del LED decorativo (clase bg-*); omitir para no mostrarlo. */
  ledClass?: string;
  /** Texto secundario a la derecha del título (contador, año). */
  meta?: ReactNode;
  children: ReactNode;
}

/**
 * Sección de contenido del portal: heading uppercase con LED opcional
 * y meta a la derecha (dialecto cliente).
 */
export function PortalSection({ title, titleId, ledClass, meta, children }: PortalSectionProps) {
  return (
    <section aria-labelledby={titleId}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"
        >
          {ledClass && (
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${ledClass}`}
              aria-hidden="true"
            />
          )}
          {title}
        </h2>
        {meta && <span className="text-xs text-slate-500 font-mono tabular-nums">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

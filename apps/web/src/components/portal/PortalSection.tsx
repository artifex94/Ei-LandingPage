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
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400"
        >
          {ledClass && (
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${ledClass}`}
              aria-hidden="true"
            />
          )}
          {title}
        </h2>
        {meta && <span className="rounded-full bg-industrial-800 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-400">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

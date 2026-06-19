interface Props {
  titulo: string;
  descripcion: string;
  cta?: { label: string; href: string };
}

export function EmptyStateSuccess({ titulo, descripcion, cta }: Props) {
  return (
    <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/10 px-6 py-10 text-center">
      <div
        className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-900/50 border border-emerald-700/50 mb-4"
        aria-hidden="true"
      >
        <span className="text-emerald-400 text-lg font-bold">✓</span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
        Todo al día
      </p>
      <p className="text-base font-semibold text-white">{titulo}</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{descripcion}</p>
      {cta && (
        <a
          href={cta.href}
          className="mt-4 inline-block text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
        >
          {cta.label} →
        </a>
      )}
    </div>
  );
}

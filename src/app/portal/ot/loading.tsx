export default function OtPortalLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando órdenes de trabajo…" className="space-y-5">
      <div className="h-7 w-44 bg-slate-700 rounded animate-pulse" />
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-56 bg-slate-700 rounded" />
                <div className="h-3 w-40 bg-slate-700 rounded" />
                <div className="h-3 w-24 bg-slate-700 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-700 rounded-full flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EventosLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando eventos…" className="space-y-5">
      <div className="h-7 w-36 bg-slate-700 rounded animate-pulse" />
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-700 rounded" />
                <div className="h-3 w-32 bg-slate-700 rounded" />
              </div>
              <div className="h-4 w-16 bg-slate-700 rounded flex-shrink-0" />
            </div>
            <div className="h-3 w-28 bg-slate-700 rounded mt-2" />
          </div>
        ))}
      </div>
    </section>
  );
}

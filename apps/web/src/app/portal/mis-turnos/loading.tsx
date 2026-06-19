export default function MisTurnosLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando turnos…" className="space-y-5">
      <div className="h-7 w-36 bg-slate-700 rounded animate-pulse" />
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-industrial-700 bg-industrial-800 p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-700 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-slate-700 rounded" />
              <div className="h-3 w-20 bg-slate-700 rounded" />
            </div>
            <div className="h-6 w-16 bg-slate-700 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

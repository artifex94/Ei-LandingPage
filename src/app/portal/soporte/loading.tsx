export default function SoporteLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando soporte…" className="space-y-5">
      <div className="h-7 w-32 bg-slate-700 rounded animate-pulse" />
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-industrial-700 bg-industrial-800 p-5">
            <div className="h-5 w-44 bg-slate-700 rounded mb-3" />
            <div className="h-4 w-full bg-slate-700 rounded mb-2" />
            <div className="h-4 w-3/4 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

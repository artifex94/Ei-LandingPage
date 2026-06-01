export default function DocumentosLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando documentos…" className="space-y-5">
      <div className="h-7 w-40 bg-slate-700 rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="h-5 w-48 bg-slate-700 rounded mb-2" />
            <div className="h-4 w-28 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

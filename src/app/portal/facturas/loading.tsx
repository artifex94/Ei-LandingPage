export default function FacturasLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando facturas…" className="space-y-5">
      <div className="h-7 w-32 bg-slate-700 rounded animate-pulse" />
      <div className="rounded-xl border border-slate-700 overflow-hidden animate-pulse">
        <div className="h-10 bg-slate-800 border-b border-slate-700" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-800">
            <div className="h-4 w-20 bg-slate-700 rounded" />
            <div className="h-4 w-28 bg-slate-700 rounded" />
            <div className="h-4 w-16 bg-slate-700 rounded ml-auto" />
            <div className="h-4 w-16 bg-slate-600 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

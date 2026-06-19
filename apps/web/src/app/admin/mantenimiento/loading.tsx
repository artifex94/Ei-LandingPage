export default function MantenimientoLoading() {
  return (
    <div className="space-y-8 max-w-4xl" aria-busy="true" aria-label="Cargando solicitudes…">
      <div className="space-y-1.5">
        <div className="h-8 w-64 bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-slate-700/60 rounded animate-pulse" />
      </div>
      <div className="h-10 w-64 bg-slate-800 rounded-xl animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-5 animate-pulse space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1">
                <div className="h-5 w-40 bg-slate-700 rounded" />
                <div className="h-3 w-56 bg-slate-700/60 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-700 rounded-full" />
            </div>
            <div className="h-4 w-full bg-slate-700/60 rounded" />
            <div className="h-4 w-3/4 bg-slate-700/40 rounded" />
            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <div className="h-9 w-28 bg-slate-700 rounded-lg" />
              <div className="h-9 w-32 bg-slate-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

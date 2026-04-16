export default function SolicitudesLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando solicitudes…">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-8 w-44 bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-slate-700/60 rounded animate-pulse" />
        </div>
        <div className="h-12 w-36 bg-slate-700 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4 animate-pulse space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-32 bg-slate-700 rounded" />
              <div className="h-6 w-20 bg-slate-700 rounded-full" />
            </div>
            <div className="h-5 w-3/4 bg-slate-700/60 rounded" />
            <div className="h-3 w-48 bg-slate-700/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

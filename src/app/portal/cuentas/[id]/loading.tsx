export default function CuentaLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando…">
      {/* breadcrumb */}
      <div className="h-4 w-48 bg-slate-700/60 rounded animate-pulse" />

      {/* encabezado */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-4 w-40 bg-slate-700/60 rounded animate-pulse" />
      </div>

      {/* panel estado */}
      <div className="h-20 bg-slate-800 rounded-xl border border-slate-700 animate-pulse" />

      {/* sensores */}
      <div>
        <div className="h-6 w-44 bg-slate-700 rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4 flex items-center justify-between animate-pulse">
              <div className="space-y-1.5">
                <div className="h-5 w-36 bg-slate-700 rounded" />
                <div className="h-3 w-48 bg-slate-700/60 rounded" />
                <div className="h-3 w-32 bg-slate-700/40 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

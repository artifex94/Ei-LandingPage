export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando…">
      <div className="h-8 w-48 bg-slate-700 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 animate-pulse space-y-2">
            <div className="h-4 w-20 bg-slate-700 rounded" />
            <div className="h-8 w-12 bg-slate-600 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 animate-pulse space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-slate-700/60 rounded" />
        ))}
      </div>
    </div>
  );
}

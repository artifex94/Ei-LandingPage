export default function DashboardLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando servicios…">
      <div className="h-8 w-48 bg-slate-700 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-64 bg-slate-700/60 rounded animate-pulse mb-8" />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="bg-industrial-800 border border-industrial-700 rounded-lg p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-slate-700 rounded" />
              <div className="h-5 w-16 bg-slate-700 rounded-full" />
            </div>
            <div className="h-4 w-24 bg-slate-700/60 rounded" />
            <div className="h-4 w-full bg-slate-700/40 rounded" />
          </li>
        ))}
      </ul>
    </section>
  );
}

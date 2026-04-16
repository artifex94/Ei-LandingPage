export default function AdminPagosLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando pagos…">
      <div className="h-8 w-44 bg-slate-700 rounded-lg animate-pulse" />
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden animate-pulse">
        <div className="h-12 bg-slate-700/60 border-b border-slate-700" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-slate-700/50">
            <div className="h-4 w-28 bg-slate-700 rounded" />
            <div className="h-4 w-20 bg-slate-700/60 rounded" />
            <div className="h-4 w-24 bg-slate-700/60 rounded" />
            <div className="ml-auto h-6 w-20 bg-slate-700 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

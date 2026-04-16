export default function PagosLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando pagos…">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-slate-700 rounded-lg animate-pulse" />
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="mb-10 animate-pulse">
          <div className="h-6 w-40 bg-slate-700 rounded mb-4" />
          {/* Calendar grid skeleton */}
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, j) => (
              <div key={j} className="bg-slate-800 border border-slate-700 rounded-xl h-16" />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

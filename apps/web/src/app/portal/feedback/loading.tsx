export default function FeedbackLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando sugerencias…" className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-slate-700 rounded" />
      <div className="h-4 w-64 bg-slate-700/60 rounded" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-24 bg-slate-700 rounded" />
            <div className="h-10 w-full bg-industrial-800 rounded-lg border border-industrial-700" />
          </div>
        ))}
        <div className="space-y-2">
          <div className="h-3.5 w-32 bg-slate-700 rounded" />
          <div className="h-24 w-full bg-industrial-800 rounded-lg border border-industrial-700" />
        </div>
      </div>
      <div className="h-12 w-40 bg-slate-700 rounded-lg" />
    </section>
  );
}

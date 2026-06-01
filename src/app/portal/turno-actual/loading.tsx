export default function TurnoActualLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando turno…" className="space-y-5 animate-pulse">
      <div className="h-7 w-40 bg-slate-700 rounded" />
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-700 rounded" />
          <div className="h-6 w-20 bg-slate-700 rounded-full" />
        </div>
        <div className="h-4 w-48 bg-slate-700/60 rounded" />
        <div className="h-12 w-full bg-slate-700 rounded-lg" />
      </div>
    </section>
  );
}

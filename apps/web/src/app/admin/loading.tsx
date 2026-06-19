export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-md bg-slate-800" />
          <div className="h-4 w-32 rounded bg-slate-800/70" />
        </div>
        <div className="h-9 w-36 rounded-md bg-slate-800" />
      </div>

      {/* Tabla / contenido principal */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <div className="bg-slate-800/60 px-4 py-3 flex gap-6">
          {[120, 180, 100, 80, 100].map((w, i) => (
            <div key={i} className="h-3.5 rounded bg-slate-700" style={{ width: w }} />
          ))}
        </div>
        <div className="divide-y divide-slate-800/60">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-slate-900 px-4 py-3.5 flex items-center gap-6">
              <div className="h-3 w-10 rounded bg-slate-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded bg-slate-800" style={{ width: `${55 + (i % 3) * 15}%` }} />
                <div className="h-2.5 w-28 rounded bg-slate-800/60" />
              </div>
              <div className="h-3 w-20 rounded bg-slate-800" />
              <div className="h-3 w-14 rounded bg-slate-800" />
              <div className="h-5 w-20 rounded bg-slate-800" />
              <div className="h-3 w-8 rounded bg-slate-800/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TecnicoLoading() {
  return (
    <div className="space-y-4 animate-pulse px-4 py-4">
      <div className="h-6 w-40 rounded-lg bg-slate-800" />
      <div className="h-4 w-60 rounded bg-slate-800/60" />

      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 rounded bg-slate-700" style={{ width: `${45 + (i % 3) * 20}%` }} />
              <div className="h-5 w-20 rounded-full bg-slate-700" />
            </div>
            <div className="h-3 w-full rounded bg-slate-700/50" />
            <div className="h-3 w-3/4 rounded bg-slate-700/50" />
            <div className="flex gap-2 pt-1">
              <div className="h-3 w-24 rounded bg-slate-700/40" />
              <div className="h-3 w-16 rounded bg-slate-700/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

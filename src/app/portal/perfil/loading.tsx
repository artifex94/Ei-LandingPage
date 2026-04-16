export default function PerfilLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Cargando perfil…">
      <div>
        <div className="h-8 w-32 bg-slate-700 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-slate-700/60 rounded animate-pulse" />
      </div>

      {/* Datos de contacto */}
      <div>
        <div className="h-6 w-40 bg-slate-700 rounded mb-4 animate-pulse" />
        <div className="bg-slate-800 rounded-2xl border border-slate-700 divide-y divide-slate-700 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="space-y-1.5">
                <div className="h-3 w-16 bg-slate-700 rounded" />
                <div className="h-5 w-36 bg-slate-600 rounded" />
              </div>
              <div className="h-8 w-20 bg-slate-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Instalaciones */}
      <div>
        <div className="h-6 w-36 bg-slate-700 rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4 animate-pulse space-y-2">
              <div className="h-5 w-48 bg-slate-700 rounded" />
              <div className="h-4 w-32 bg-slate-700/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

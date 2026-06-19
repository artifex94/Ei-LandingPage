import Link from "next/link";

export default function TecnicoNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-5xl font-bold font-mono text-slate-700 mb-4">404</p>
      <h1 className="text-lg font-bold text-white mb-2">No encontrado</h1>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">
        Esta orden o tarea no existe o ya no está disponible.
      </p>
      <Link
        href="/tecnico/mi-dia"
        className="bg-amber-700 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors min-h-[44px] flex items-center"
      >
        Volver a mi día
      </Link>
    </div>
  );
}

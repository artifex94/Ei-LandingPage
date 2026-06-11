import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-5xl font-bold font-mono text-slate-700 mb-4">404</p>
      <h1 className="text-lg font-bold text-white mb-2">Registro no encontrado</h1>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">
        El recurso que buscás no existe o fue eliminado.
      </p>
      <Link
        href="/admin/dashboard"
        className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-semibold px-6 py-3 rounded-lg text-sm transition-colors min-h-[44px] flex items-center"
      >
        Volver al panel
      </Link>
    </div>
  );
}

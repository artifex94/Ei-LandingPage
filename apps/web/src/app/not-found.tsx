import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <p className="text-6xl font-bold font-mono text-slate-700">404</p>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Página no encontrada</h1>
          <p className="text-slate-400 text-sm">
            La dirección que buscás no existe o fue movida.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href="/portal/dashboard"
            className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] flex items-center"
          >
            Ir al portal
          </Link>
          <Link
            href="/"
            className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-5 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] flex items-center"
          >
            Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

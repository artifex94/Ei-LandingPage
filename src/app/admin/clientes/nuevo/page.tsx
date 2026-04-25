import Link from "next/link";
import { NuevoClienteForm } from "@/components/admin/NuevoClienteForm";

export default function NuevoClientePage() {
  return (
    <div className="max-w-xl">
      <nav aria-label="Ruta de navegación" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/clientes" className="hover:text-white transition-colors">
              Clientes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium">Nuevo cliente</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-white mb-2">Nuevo cliente</h1>
      <p className="text-sm text-slate-400 mb-6">
        Se creará un usuario en Supabase Auth y su perfil de cliente en el sistema.
      </p>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <NuevoClienteForm />
      </div>
    </div>
  );
}

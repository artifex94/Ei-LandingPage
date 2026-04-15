import Link from "next/link";
import { NuevoClienteForm } from "@/components/admin/NuevoClienteForm";

export default function NuevoClientePage() {
  return (
    <div className="max-w-xl">
      <nav aria-label="Ruta de navegación" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-500">
          <li>
            <Link href="/admin/clientes" className="hover:text-slate-900">
              Clientes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-900 font-medium">Nuevo cliente</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nuevo cliente</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <NuevoClienteForm />
      </div>
    </div>
  );
}

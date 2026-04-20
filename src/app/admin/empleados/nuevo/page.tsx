import Link from "next/link";
import { NuevoEmpleadoForm } from "@/components/admin/NuevoEmpleadoForm";

export const metadata = { title: "Nuevo empleado — Admin" };

export default function NuevoEmpleadoPage() {
  return (
    <div className="max-w-xl">
      <nav aria-label="Ruta de navegación" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/empleados" className="hover:text-white transition-colors">
              Empleados
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium">Nuevo empleado</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-white mb-2">Nuevo empleado</h1>
      <p className="text-sm text-slate-400 mb-6">
        Se creará un usuario en Supabase Auth y su perfil de empleado en el sistema.
      </p>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <NuevoEmpleadoForm />
      </div>
    </div>
  );
}

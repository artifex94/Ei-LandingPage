import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { EmpleadosTable } from "@/components/admin/empleados/EmpleadosTable";

export const metadata: Metadata = { title: "Empleados — Admin" };

const ROL_LABEL: Record<string, string> = {
  ADMIN_GENERAL:  "Admin",
  MONITOR:        "Monitor",
  TECNICO:        "Técnico",
  ADMINISTRATIVO: "Administrativo",
};

export default async function EmpleadosPage() {
  const empleados = await prisma.empleado.findMany({
    include: { perfil: true },
    orderBy: { created_at: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Empleados</h1>
          <p className="text-sm text-slate-400 mt-1">
            {empleados.filter((e) => e.activo).length} activos de {empleados.length} total
          </p>
        </div>
        <Link
          href="/admin/empleados/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
        >
          + Nuevo empleado
        </Link>
      </div>

      <EmpleadosTable empleados={empleados} rolLabel={ROL_LABEL} />
    </div>
  );
}

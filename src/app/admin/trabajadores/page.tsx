import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { EmpleadosTable } from "@/components/admin/empleados/EmpleadosTable";
import type { RolEmpleado } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Equipo — Admin" };

const TABS: { key: string; label: string }[] = [
  { key: "todos",          label: "Todos" },
  { key: "TECNICO",        label: "Técnicos" },
  { key: "MONITOR",        label: "Monitores" },
  { key: "ADMINISTRATIVO", label: "Administrativos" },
  { key: "ADMIN_GENERAL",  label: "Admins" },
];

const ROL_LABEL: Record<string, string> = {
  ADMIN_GENERAL:  "Admin",
  MONITOR:        "Monitor",
  TECNICO:        "Técnico",
  ADMINISTRATIVO: "Administrativo",
};

export default async function TrabajadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const esEscobarAdmin = user.email === "admin@instalacionescob.ar";

  const sp = await searchParams;
  const filtroRol = sp.rol ?? "todos";

  const where = filtroRol !== "todos" ? { rol_empleado: filtroRol as RolEmpleado } : {};

  const [empleados, totalCount] = await Promise.all([
    prisma.empleado.findMany({
      where,
      include: { perfil: true },
      orderBy: [{ activo: "desc" }, { created_at: "asc" }],
    }),
    prisma.empleado.count(),
  ]);

  const activosCount = empleados.filter((e) => e.activo).length;

  const tabsVisibles = TABS.filter((t) => t.key !== "ADMIN_GENERAL" || esEscobarAdmin);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipo</h1>
          <p className="text-sm text-slate-400 mt-1">
            {activosCount} activos · {totalCount} en total
          </p>
        </div>
        <Link
          href="/admin/trabajadores/nuevo"
          className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          + Nuevo trabajador
        </Link>
      </div>

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit border border-slate-700 flex-wrap">
        {tabsVisibles.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/trabajadores?rol=${tab.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroRol === tab.key
                ? "bg-slate-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <EmpleadosTable
        empleados={empleados}
        rolLabel={ROL_LABEL}
        basePath="/admin/trabajadores"
      />
    </div>
  );
}

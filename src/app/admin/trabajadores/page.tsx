import type { Metadata } from "next";
import Link from "next/link";
import { startOfWeek, endOfWeek } from "date-fns";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { EmpleadosTable } from "@/components/admin/empleados/EmpleadosTable";
import { siteConfig } from "@/config/site";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_TRABAJADORES = [
  {
    titulo: "Roles del equipo",
    descripcion: "Admin: acceso total. Técnico: gestiona OTs y tareas. Monitor: procesa eventos de alarma. Facturador: acceso a facturación.",
  },
  {
    titulo: "Capacidades adicionales",
    descripcion: "Un empleado puede tener múltiples capacidades habilitadas (puede_instalar, puede_monitorear, puede_facturar) más allá de su rol principal.",
  },
  {
    titulo: "Crear un trabajador",
    descripcion: 'El botón "+ Nuevo" crea el usuario en Supabase Auth y el perfil en la base de datos. El empleado recibe un email para configurar su contraseña.',
  },
];
import type { RolEmpleado } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Equipo" };

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
  const adminPerfil = await requireAdmin();
  const esEscobarAdmin = adminPerfil.email === siteConfig.contact.email;

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

  // En el tab Técnicos se muestra la carga de tareas de la semana en curso
  let tareasSemana: Record<string, number> | undefined;
  if (filtroRol === "TECNICO") {
    const hoy = new Date();
    const lunes = startOfWeek(hoy, { weekStartsOn: 1 });
    const domingo = endOfWeek(hoy, { weekStartsOn: 1 });

    const tecnicos = await prisma.perfil.findMany({
      where: { rol: "TECNICO" },
      select: {
        id: true,
        _count: {
          select: {
            tareas_asignadas: {
              where: {
                fecha: { gte: lunes, lte: domingo },
                estado: { in: ["PENDIENTE", "EN_CURSO"] },
              },
            },
          },
        },
      },
    });
    tareasSemana = Object.fromEntries(tecnicos.map((t) => [t.id, t._count.tareas_asignadas]));
  }

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
          className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-slate-900 px-4 py-2 min-h-[44px] flex items-center rounded-lg transition-colors shrink-0"
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
        tareasSemana={tareasSemana}
      />

      <TutorialContextual
        section="trabajadores"
        titulo="Guía rápida — Equipo"
        steps={TUTORIAL_TRABAJADORES}
      />
    </div>
  );
}

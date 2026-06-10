import Link from "next/link";
import { startOfWeek, endOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma/client";
import { DataTable, type Column } from "@/components/ui/DataTable";

export const metadata = { title: "Técnicos" };

export default async function TecnicosPage() {
  const hoy = new Date();
  const lunes = startOfWeek(hoy, { weekStartsOn: 1 });
  const domingo = endOfWeek(hoy, { weekStartsOn: 1 });

  const tecnicos = await prisma.perfil.findMany({
    where: { rol: "TECNICO" },
    include: {
      tareas_asignadas: {
        where: {
          fecha: { gte: lunes, lte: domingo },
          estado: { in: ["PENDIENTE", "EN_CURSO"] },
        },
        select: { id: true },
      },
    },
    orderBy: { nombre: "asc" },
  });

  type TecnicoRow = (typeof tecnicos)[number];

  const columns: Column<TecnicoRow>[] = [
    {
      id: "nombre",
      header: "Nombre",
      cell: (t) => <span className="font-medium text-white">{t.nombre}</span>,
    },
    {
      id: "email",
      header: "Email",
      className: "hidden sm:table-cell",
      cell: (t) => <span className="text-slate-400">{t.email ?? "—"}</span>,
    },
    {
      id: "telefono",
      header: "Teléfono",
      className: "hidden md:table-cell",
      cell: (t) => <span className="text-slate-400">{t.telefono ?? "—"}</span>,
    },
    {
      id: "tareas",
      header: "Tareas esta semana",
      align: "center",
      cell: (t) =>
        t.tareas_asignadas.length > 0 ? (
          <Link
            href={`/admin/agenda?tecnico=${t.id}`}
            aria-label={`Ver ${t.tareas_asignadas.length} tareas de ${t.nombre}`}
            className="inline-block bg-orange-500/20 text-orange-300 text-xs font-bold px-2.5 py-0.5 rounded-full hover:bg-orange-500/30 transition-colors"
          >
            {t.tareas_asignadas.length}
          </Link>
        ) : (
          <span className="text-slate-500">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Técnicos</h1>
        <Link
          href="/admin/tecnicos/nuevo"
          className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-slate-900 px-4 py-2 min-h-[44px] flex items-center rounded-lg transition-colors"
        >
          + Nuevo técnico
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={tecnicos}
        keyExtractor={(t) => t.id}
        caption="Listado de técnicos"
        emptyState={
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-500 text-sm">No hay técnicos registrados.</p>
            <Link
              href="/admin/tecnicos/nuevo"
              className="mt-3 inline-block text-sm text-orange-400 hover:text-orange-300"
            >
              Crear el primero →
            </Link>
          </div>
        }
      />
    </div>
  );
}

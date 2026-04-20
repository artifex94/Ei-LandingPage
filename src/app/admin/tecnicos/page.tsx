import Link from "next/link";
import { startOfWeek, endOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma/client";

export const metadata = { title: "Técnicos — Admin EI" };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Técnicos</h1>
        <Link
          href="/admin/tecnicos/nuevo"
          className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo técnico
        </Link>
      </div>

      {tecnicos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <p className="text-slate-500 text-sm">No hay técnicos registrados.</p>
          <Link
            href="/admin/tecnicos/nuevo"
            className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
          >
            Crear el primero →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Teléfono
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tareas esta semana
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tecnicos.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{t.nombre}</td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {t.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                    {t.telefono ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.tareas_asignadas.length > 0 ? (
                      <Link
                        href={`/admin/agenda?tecnico=${t.id}`}
                        className="inline-block bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full hover:bg-indigo-500/30 transition-colors"
                      >
                        {t.tareas_asignadas.length}
                      </Link>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

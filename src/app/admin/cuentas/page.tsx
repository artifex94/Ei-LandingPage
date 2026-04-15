import Link from "next/link";
import { prisma } from "@/lib/prisma/client";

const ESTADO_COLORES: Record<string, string> = {
  ACTIVA: "bg-green-900/40 text-green-400",
  SUSPENDIDA_PAGO: "bg-red-900/40 text-red-400",
  EN_MANTENIMIENTO: "bg-yellow-900/40 text-yellow-400",
  BAJA_DEFINITIVA: "bg-slate-700 text-slate-400",
};

const CATEGORIA_LABELS: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma",
  DOMOTICA: "Domótica",
  CAMARA_CCTV: "CCTV",
  ANTENA_STARLINK: "StarLink",
  OTRO: "Otro",
};

export default async function CuentasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado, q } = await searchParams;

  const cuentas = await prisma.cuenta.findMany({
    where: {
      ...(estado ? { estado: estado as never } : {}),
      ...(q
        ? {
            OR: [
              { descripcion: { contains: q, mode: "insensitive" } },
              { softguard_ref: { contains: q } },
              { perfil: { nombre: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      perfil: { select: { nombre: true } },
      _count: { select: { sensores: true } },
    },
    orderBy: { descripcion: "asc" },
    take: 100,
  });

  const estados = ["ACTIVA", "SUSPENDIDA_PAGO", "EN_MANTENIMIENTO", "BAJA_DEFINITIVA"];

  return (
    <section aria-labelledby="cuentas-heading">
      <h1 id="cuentas-heading" className="text-2xl font-bold text-white mb-6">
        Cuentas ({cuentas.length})
      </h1>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por dirección, ref. o cliente..."
          className="bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm min-h-[44px] w-64 focus:outline-2 focus:outline-orange-500"
        />
        <select
          name="estado"
          defaultValue={estado ?? ""}
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        >
          <option value="">Todos los estados</option>
          {estados.map((e) => (
            <option key={e} value={e}>
              {e.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors"
        >
          Filtrar
        </button>
      </form>

      {cuentas.length === 0 ? (
        <p className="text-slate-400">No se encontraron cuentas.</p>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Dirección</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Categoría</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Tarifa</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {cuentas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-700/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate">
                    {c.descripcion}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.perfil.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {CATEGORIA_LABELS[c.categoria] ?? c.categoria}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLORES[c.estado] ?? "bg-slate-700 text-slate-400"}`}>
                      {c.estado.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    ${Number(c.costo_mensual).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/cuentas/${c.id}`}
                      className="text-orange-400 hover:text-orange-300 hover:underline min-h-[44px] flex items-center transition-colors"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma/client";

const ESTADO_COLORES: Record<string, string> = {
  ACTIVA:           "bg-green-900/40 text-green-400",
  SUSPENDIDA_PAGO:  "bg-red-900/40 text-red-400",
  EN_MANTENIMIENTO: "bg-yellow-900/40 text-yellow-400",
  BAJA_DEFINITIVA:  "bg-slate-700 text-slate-400",
};

const ESTADO_LABELS: Record<string, string> = {
  ACTIVA:           "Activa",
  SUSPENDIDA_PAGO:  "Suspendida",
  EN_MANTENIMIENTO: "Mantenimiento",
  BAJA_DEFINITIVA:  "Baja",
};

const CATEGORIA_LABELS: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma",
  DOMOTICA:         "Domótica",
  CAMARA_CCTV:      "CCTV",
  ANTENA_STARLINK:  "StarLink",
  OTRO:             "Otro",
};

const POR_PAGINA = 40;

export default async function CuentasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  const { estado, q, pagina: paginaStr } = await searchParams;
  const pagina = Math.max(1, Number(paginaStr ?? 1));

  const where = {
    ...(estado ? { estado: estado as never } : {}),
    ...(q
      ? {
          OR: [
            { descripcion: { contains: q, mode: "insensitive" as const } },
            { softguard_ref: { contains: q } },
            { perfil: { nombre: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, cuentas] = await Promise.all([
    prisma.cuenta.count({ where }),
    prisma.cuenta.findMany({
      where,
      include: {
        perfil: { select: { nombre: true } },
        _count: { select: { sensores: true } },
      },
      orderBy: { descripcion: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const estados = ["ACTIVA", "SUSPENDIDA_PAGO", "EN_MANTENIMIENTO", "BAJA_DEFINITIVA"];

  return (
    <section aria-labelledby="cuentas-heading">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 id="cuentas-heading" className="text-2xl font-bold text-white">
          Cuentas ({cuentas.length})
        </h1>
        <a
          href="/api/admin/export?tipo=cuentas"
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-3 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors shrink-0"
          title="Exportar a Excel"
        >
          ↓ Excel
        </a>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar..."
          className="flex-1 min-w-[160px] bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        />
        <select
          name="estado"
          defaultValue={estado ?? ""}
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        >
          <option value="">Todos</option>
          {estados.map((e) => (
            <option key={e} value={e}>{ESTADO_LABELS[e] ?? e}</option>
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
        <>
          {/* ── Tabla — desktop ──────────────────────────────────────────────── */}
          <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Descripción</th>
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
                    <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate">{c.descripcion}</td>
                    <td className="px-4 py-3 text-slate-300">{c.perfil.nombre}</td>
                    <td className="px-4 py-3 text-slate-300">{CATEGORIA_LABELS[c.categoria] ?? c.categoria}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLORES[c.estado] ?? "bg-slate-700 text-slate-400"}`}>
                        {ESTADO_LABELS[c.estado] ?? c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">${Number(c.costo_mensual).toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/cuentas/${c.id}`} className="text-orange-400 hover:text-orange-300 hover:underline min-h-[44px] flex items-center transition-colors">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Cards — mobile ───────────────────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {cuentas.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cuentas/${c.id}`}
                className="block bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 hover:border-orange-500/50 active:bg-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{c.descripcion}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{c.perfil.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{CATEGORIA_LABELS[c.categoria] ?? c.categoria}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-1.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full block ${ESTADO_COLORES[c.estado] ?? "bg-slate-700 text-slate-400"}`}>
                      {ESTADO_LABELS[c.estado] ?? c.estado}
                    </span>
                    <p className="text-white text-sm font-semibold">
                      ${Number(c.costo_mensual).toLocaleString("es-AR")}
                    </p>
                    <p className="text-orange-400 text-xs">Ver →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-700">
          <span className="text-sm text-slate-400">
            Página {pagina} de {totalPaginas} · {total} cuentas
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <a
                href={`/admin/cuentas?pagina=${pagina - 1}${estado ? `&estado=${estado}` : ""}${q ? `&q=${q}` : ""}`}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ← Anterior
              </a>
            )}
            {pagina < totalPaginas && (
              <a
                href={`/admin/cuentas?pagina=${pagina + 1}${estado ? `&estado=${estado}` : ""}${q ? `&q=${q}` : ""}`}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Siguiente →
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

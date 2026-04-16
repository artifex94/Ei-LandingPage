import Link from "next/link";
import { prisma } from "@/lib/prisma/client";

const POR_PAGINA = 30;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q, pagina: paginaStr } = await searchParams;
  const pagina = Math.max(1, Number(paginaStr ?? 1));

  const where = q
    ? {
        OR: [
          { nombre: { contains: q, mode: "insensitive" as const } },
          { dni: { contains: q } },
          { telefono: { contains: q } },
        ],
      }
    : undefined;

  const [total, perfiles] = await Promise.all([
    prisma.perfil.count({ where }),
    prisma.perfil.findMany({
      where,
      include: { cuentas: { select: { id: true, estado: true } } },
      orderBy: { nombre: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  return (
    <section aria-labelledby="clientes-heading">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 id="clientes-heading" className="text-2xl font-bold text-white">
          Clientes ({perfiles.length})
        </h1>
        <div className="flex gap-2 shrink-0">
          <a
            href="/api/admin/export?tipo=clientes"
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-3 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors"
            title="Exportar a Excel"
          >
            ↓ Excel
          </a>
          <Link
            href="/admin/clientes/nuevo"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors"
          >
            + Nuevo
          </Link>
        </div>
      </div>

      <form method="GET" className="mb-6">
        <label htmlFor="busqueda" className="sr-only">Buscar cliente</label>
        <input
          id="busqueda"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre, DNI o teléfono..."
          className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-4 py-2 text-sm focus:outline-2 focus:outline-orange-500 min-h-[44px]"
        />
      </form>

      {perfiles.length === 0 ? (
        <p className="text-slate-400">No se encontraron clientes.</p>
      ) : (
        <>
          {/* ── Tabla — desktop ──────────────────────────────────────────────── */}
          <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">DNI</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Cuentas</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {perfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{p.dni ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{p.telefono ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{p.cuentas.length}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clientes/${p.id}`}
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

          {/* ── Cards — mobile ───────────────────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {perfiles.map((p) => (
              <Link
                key={p.id}
                href={`/admin/clientes/${p.id}`}
                className="block bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 hover:border-orange-500/50 active:bg-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{p.nombre}</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      DNI: {p.dni ?? "—"}
                    </p>
                    {p.telefono && (
                      <p className="text-sm text-slate-400">{p.telefono}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-medium">
                      {p.cuentas.length} cuenta{p.cuentas.length !== 1 ? "s" : ""}
                    </span>
                    <p className="text-orange-400 text-xs mt-2">Ver →</p>
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
            Página {pagina} de {totalPaginas} · {total} clientes
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <a
                href={`/admin/clientes?pagina=${pagina - 1}${q ? `&q=${q}` : ""}`}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ← Anterior
              </a>
            )}
            {pagina < totalPaginas && (
              <a
                href={`/admin/clientes?pagina=${pagina + 1}${q ? `&q=${q}` : ""}`}
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

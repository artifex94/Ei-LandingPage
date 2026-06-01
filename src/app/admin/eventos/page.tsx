import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { EventoEstadoBadge, ESTADO_LABEL } from "@/components/admin/eventos/EventoEstadoBadge";

export const metadata: Metadata = { title: "Eventos de alarma" };

const POR_PAGINA = 50;

const ESTADOS = [
  "NUEVO",
  "EN_PROCESO",
  "EN_ESPERA",
  "EN_PROCESO_DESDE_ESPERA",
  "EN_PROCESO_MULTIPLE",
  "PROCESADO",
  "PROCESADO_NO_ALERTA",
  "PROCESADO_MODO_PRUEBA",
  "PROCESADO_MODO_OFF",
] as const;

function buildDateRange(periodo: string | undefined): { gte?: Date; lte?: Date } {
  const now = new Date();
  if (periodo === "hoy") {
    const desde = new Date(now); desde.setHours(0, 0, 0, 0);
    const hasta = new Date(now); hasta.setHours(23, 59, 59, 999);
    return { gte: desde, lte: hasta };
  }
  if (periodo === "semana") {
    const desde = new Date(now); desde.setDate(now.getDate() - 7); desde.setHours(0, 0, 0, 0);
    return { gte: desde };
  }
  if (periodo === "mes") {
    const desde = new Date(now); desde.setDate(now.getDate() - 30); desde.setHours(0, 0, 0, 0);
    return { gte: desde };
  }
  return {};
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; periodo?: string; q?: string; pagina?: string }>;
}) {
  const { estado, periodo, q, pagina: paginaStr } = await searchParams;
  const pagina = Math.max(1, Number(paginaStr ?? 1));

  const dateFilter = buildDateRange(periodo);

  const where = {
    ...(estado && ESTADOS.includes(estado as typeof ESTADOS[number])
      ? { estado: { equals: estado as typeof ESTADOS[number] } }
      : {}),
    ...(Object.keys(dateFilter).length > 0 ? { fecha_evento: dateFilter } : {}),
    ...(q
      ? {
          OR: [
            { descripcion: { contains: q, mode: "insensitive" as const } },
            { codigo: { contains: q, mode: "insensitive" as const } },
            {
              cuenta: {
                perfil: { nombre: { contains: q, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : {}),
  };

  const [total, eventos] = await Promise.all([
    prisma.eventoAlarma.count({ where }),
    prisma.eventoAlarma.findMany({
      where,
      include: {
        cuenta: {
          select: {
            descripcion: true,
            softguard_ref: true,
            perfil: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha_evento: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { estado, periodo, q, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/eventos?${params.toString()}`;
  }

  return (
    <section aria-labelledby="eventos-heading">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 id="eventos-heading" className="text-2xl font-bold text-white">
            Eventos de alarma
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sincronizados desde SoftGuard · {total} resultado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/sync-softguard"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
        >
          Sincronizar →
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar cuenta o código..."
          aria-label="Buscar por nombre de cuenta o código de evento"
          className="flex-1 min-w-[160px] bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        />
        <select
          name="estado"
          defaultValue={estado ?? ""}
          aria-label="Filtrar por estado"
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e] ?? e}
            </option>
          ))}
        </select>
        <select
          name="periodo"
          defaultValue={periodo ?? ""}
          aria-label="Filtrar por período"
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        >
          <option value="">Todo el tiempo</option>
          <option value="hoy">Hoy</option>
          <option value="semana">Últimos 7 días</option>
          <option value="mes">Últimos 30 días</option>
        </select>
        <button
          type="submit"
          className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors"
        >
          Filtrar
        </button>
        {(estado || periodo || q) && (
          <Link
            href="/admin/eventos"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-300 px-4 py-2 rounded-lg text-sm min-h-[44px] flex items-center transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {eventos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-slate-400">No hay eventos que coincidan con los filtros.</p>
          <p className="text-xs text-slate-500 mt-1">
            Ajustá los filtros o{" "}
            <Link href="/admin/eventos" className="text-indigo-400 hover:text-indigo-300">
              limpiá la búsqueda
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm" aria-label="Tabla de eventos de alarma">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    Fecha
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell"
                  >
                    Cuenta
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    Evento
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell"
                  >
                    Zona
                  </th>
                  <th
                    scope="col"
                    className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell"
                  >
                    Notif.
                  </th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {eventos.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                      {new Date(ev.fecha_evento).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-white text-xs font-medium">
                        {ev.cuenta?.perfil.nombre ?? ev.softguard_ref}
                      </p>
                      <p className="text-slate-500 text-xs">{ev.cuenta?.descripcion}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium">{ev.descripcion}</p>
                      <p className="text-slate-400 text-xs font-mono">{ev.codigo}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                      {ev.zona ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <EventoEstadoBadge estado={ev.estado} />
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {ev.notificado_cliente ? (
                        <span className="text-emerald-400 text-xs" aria-label="Notificado">✓</span>
                      ) : (
                        <span className="text-slate-500 text-xs" aria-label="No notificado">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/eventos/${ev.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        aria-label={`Ver detalle del evento ${ev.descripcion}`}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-700">
              <span className="text-sm text-slate-400">
                Página {pagina} de {totalPaginas} · {total} evento{total !== 1 ? "s" : ""}
              </span>
              <nav aria-label="Paginación de eventos" className="flex gap-2">
                {pagina > 1 && (
                  <Link
                    href={buildHref({ pagina: String(pagina - 1) })}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {pagina < totalPaginas && (
                  <Link
                    href={buildHref({ pagina: String(pagina + 1) })}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </nav>
            </div>
          )}
        </>
      )}
    </section>
  );
}

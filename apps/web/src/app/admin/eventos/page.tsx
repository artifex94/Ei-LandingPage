import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { EventoEstadoBadge } from "@/components/admin/eventos/EventoEstadoBadge";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { EmptyStateSuccess } from "@/components/admin/EmptyStateSuccess";
import { StagePipeline } from "@/components/admin/StagePipeline";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Bell, Loader, PauseCircle, CheckCircle2 } from "lucide-react";

const TUTORIAL_EVENTOS = [
  {
    titulo: "Qué es un evento de alarma",
    descripcion: "Es una señal que llegó desde SoftGuard: robo, pánico, falla, test. Cada evento tiene tipo, zona y operador que lo procesó.",
  },
  {
    titulo: "Eventos NUEVO — acción urgente",
    descripcion: "Los que aparecen en rojo aún no fueron procesados. El operador de monitoreo debe abrirlos y registrar la acción tomada.",
  },
  {
    titulo: "Procesar un evento",
    descripcion: "Abrí el evento, completá las notas de intervención y cambiá el estado a EN_PROCESO o CERRADO según corresponda.",
  },
  {
    titulo: "Diferencia con mantenimiento",
    descripcion: "Eventos son señales automáticas de alarma. Mantenimiento son solicitudes de asistencia técnica que hace el cliente.",
  },
];

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

  const [total, eventos, countsByEstado] = await Promise.all([
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
    prisma.eventoAlarma.groupBy({
      by: ["estado"],
      _count: { estado: true },
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  const countEst = (e: string) =>
    countsByEstado.find((r) => r.estado === e)?._count.estado ?? 0;

  const EVENTO_STAGES = [
    {
      key: "NUEVO",
      label: "Nuevo",
      count: countEst("NUEVO"),
      href: buildHrefStatic({ estado: "NUEVO" }),
      activeCls: "bg-red-950/50 text-red-300",
      countCls: "text-red-300",
      icon: Bell,
    },
    {
      key: "EN_PROCESO",
      label: "En proceso",
      count: countEst("EN_PROCESO") + countEst("EN_PROCESO_MULTIPLE") + countEst("EN_PROCESO_DESDE_ESPERA"),
      href: buildHrefStatic({ estado: "EN_PROCESO" }),
      activeCls: "bg-blue-950/50 text-blue-300",
      countCls: "text-blue-300",
      icon: Loader,
    },
    {
      key: "EN_ESPERA",
      label: "En espera",
      count: countEst("EN_ESPERA"),
      href: buildHrefStatic({ estado: "EN_ESPERA" }),
      activeCls: "bg-amber-950/50 text-amber-300",
      countCls: "text-amber-300",
      icon: PauseCircle,
    },
    {
      key: "CERRADO",
      label: "Cerrado",
      count: countEst("CERRADO"),
      href: buildHrefStatic({ estado: "CERRADO" }),
      activeCls: "bg-slate-700 text-slate-300",
      countCls: "text-slate-400",
      icon: CheckCircle2,
    },
  ] as const;

  function buildHrefStatic(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { estado, periodo, q, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/eventos?${params.toString()}`;
  }

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { estado, periodo, q, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/eventos?${params.toString()}`;
  }

  type EventoRow = (typeof eventos)[number];

  const columns: Column<EventoRow>[] = [
    {
      id: "fecha",
      header: "Fecha",
      cell: (ev) => (
        <span className="text-slate-300 text-xs whitespace-nowrap">
          {new Date(ev.fecha_evento).toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Argentina/Buenos_Aires",
          })}
        </span>
      ),
    },
    {
      id: "cuenta",
      header: "Cuenta",
      className: "hidden sm:table-cell",
      cell: (ev) => (
        <>
          <p className="text-white text-xs font-medium">
            {ev.cuenta?.perfil.nombre ?? ev.softguard_ref}
          </p>
          <p className="text-slate-500 text-xs">{ev.cuenta?.descripcion}</p>
        </>
      ),
    },
    {
      id: "evento",
      header: "Evento",
      cell: (ev) => (
        <>
          <p className="text-white text-xs font-medium">{ev.descripcion}</p>
          <p className="text-slate-400 text-xs font-mono">{ev.codigo}</p>
        </>
      ),
    },
    {
      id: "zona",
      header: "Zona",
      className: "hidden md:table-cell",
      cell: (ev) => <span className="text-slate-400 text-xs">{ev.zona ?? "—"}</span>,
    },
    {
      id: "estado",
      header: "Estado",
      align: "center",
      cell: (ev) => <EventoEstadoBadge estado={ev.estado} />,
    },
    {
      id: "notif",
      header: "Notif.",
      align: "center",
      className: "hidden lg:table-cell",
      cell: (ev) =>
        ev.notificado_cliente ? (
          <span className="text-emerald-400 text-xs" aria-label="Notificado">✓</span>
        ) : (
          <span className="text-slate-500 text-xs" aria-label="No notificado">—</span>
        ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      cell: (ev) => (
        <Link
          href={`/admin/eventos/${ev.id}`}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          aria-label={`Ver detalle del evento ${ev.descripcion}`}
        >
          Ver →
        </Link>
      ),
    },
  ];

  const emptyNode =
    estado === "NUEVO" ? (
      <EmptyStateSuccess
        titulo="¡Central limpia!"
        descripcion="No hay eventos de alarma sin procesar. El sistema está monitoreado al 100%."
        cta={{ label: "Ver todos los eventos", href: "/admin/eventos" }}
      />
    ) : (
      <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
        <p className="text-slate-400">No hay eventos que coincidan con los filtros.</p>
        <p className="text-xs text-slate-500 mt-1">
          Ajustá los filtros o{" "}
          <Link href="/admin/eventos" className="text-orange-400 hover:text-orange-300">
            limpiá la búsqueda
          </Link>
          .
        </p>
      </div>
    );

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
          className="text-sm text-orange-400 hover:text-orange-300 transition-colors shrink-0"
        >
          Sincronizar →
        </Link>
      </div>

      {/* Pipeline de estados */}
      <StagePipeline
        stages={EVENTO_STAGES}
        activeKey={estado ?? "NUEVO"}
        className="mb-6"
      />

      {/* Filtros de búsqueda y período */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar cuenta o código..."
          aria-label="Buscar por nombre de cuenta o código de evento"
          className="flex-1 min-w-[160px] bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        />
        {/* Estado oculto para que el form no pise el pipeline */}
        {estado && <input type="hidden" name="estado" value={estado} />}
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

      <DataTable
        columns={columns}
        rows={eventos}
        keyExtractor={(ev) => ev.id}
        caption="Tabla de eventos de alarma"
        emptyState={emptyNode}
      />

      {totalPaginas > 1 && (
        <div className="pt-4 mt-4 border-t border-slate-700">
          <Pagination
            page={pagina}
            pageCount={totalPaginas}
            makeHref={(n) => buildHref({ pagina: String(n) })}
          />
        </div>
      )}

      <TutorialContextual
        section="eventos"
        titulo="Guía rápida — Eventos de alarma"
        steps={TUTORIAL_EVENTOS}
      />
    </section>
  );
}

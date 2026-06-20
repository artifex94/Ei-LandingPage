import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Auditoría" };

const TUTORIAL_AUDITORIA = [
  {
    titulo: "Para qué sirve",
    descripcion: "Registra todas las acciones realizadas por administradores: pagos registrados, estados cambiados, clientes creados, etc.",
  },
  {
    titulo: "Filtrar por acción",
    descripcion: "Usá el filtro de arriba para ver solo un tipo de acción (pagos, solicitudes, etc.) y encontrar cuándo pasó algo puntual.",
  },
  {
    titulo: "No es editable",
    descripcion: "El log de auditoría es de solo lectura. No se puede modificar ni eliminar. Es la fuente de verdad de cambios históricos.",
  },
];

const ACCION_LABELS: Record<string, { label: string; color: string }> = {
  CUENTA_CREADA:        { label: "Cuenta creada",       color: "text-green-400 bg-green-900/30" },
  CUENTA_ACTUALIZADA:   { label: "Cuenta actualizada",  color: "text-blue-400 bg-blue-900/30" },
  CUENTA_BAJA_DEFINITIVA: { label: "Baja definitiva",   color: "text-red-400 bg-red-900/30" },
  CLIENTE_EDITADO:      { label: "Cliente editado",      color: "text-orange-400 bg-orange-900/30" },
  PAGO_REGISTRADO:      { label: "Pago registrado",      color: "text-emerald-400 bg-emerald-900/30" },
  SENSOR_CREADO:        { label: "Sensor creado",        color: "text-cyan-400 bg-cyan-900/30" },
  SENSOR_ACTUALIZADO:   { label: "Sensor actualizado",   color: "text-cyan-400 bg-cyan-900/30" },
  SENSOR_ELIMINADO:     { label: "Sensor eliminado",     color: "text-slate-400 bg-slate-700" },
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; accion?: string }>;
}) {
  const { pagina: paginaStr, accion: accionFiltro } = await searchParams;
  const pagina = Math.max(1, Number(paginaStr ?? 1));
  const POR_PAGINA = 50;

  const where = accionFiltro ? { accion: accionFiltro } : {};

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  type LogRow = (typeof logs)[number];

  const columns: Column<LogRow>[] = [
    {
      id: "fecha",
      header: "Fecha",
      cell: (log) => (
        <span className="text-slate-400 text-xs whitespace-nowrap">
          {new Date(log.created_at).toLocaleString("es-AR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      id: "admin",
      header: "Admin",
      cell: (log) => <span className="text-white font-medium text-xs">{log.admin_nombre ?? "—"}</span>,
    },
    {
      id: "accion",
      header: "Acción",
      cell: (log) => {
        const cfg = ACCION_LABELS[log.accion] ?? { label: log.accion, color: "text-slate-400 bg-slate-700" };
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>;
      },
    },
    {
      id: "entidad",
      header: "Entidad",
      cell: (log) => (
        <span className="text-slate-400 text-xs font-mono">
          {log.entidad}
          <br />
          <span className="opacity-60">{log.entidad_id.slice(0, 12)}…</span>
        </span>
      ),
    },
    {
      id: "detalle",
      header: "Detalle",
      className: "max-w-xs",
      cell: (log) => {
        let detalle: Record<string, unknown> | null = null;
        try { detalle = log.detalle ? JSON.parse(log.detalle) : null; } catch { /* noop */ }
        return detalle ? (
          <details className="text-slate-400 text-xs">
            <summary className="cursor-pointer hover:text-slate-200 transition-colors">Ver detalle</summary>
            <pre className="mt-2 text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(detalle, null, 2)}
            </pre>
          </details>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
    },
  ];

  const renderCard = (log: LogRow) => {
    const cfg = ACCION_LABELS[log.accion] ?? { label: log.accion, color: "text-slate-400 bg-slate-700" };
    let detalleTexto: string | null = null;
    try {
      detalleTexto = log.detalle ? JSON.stringify(JSON.parse(log.detalle), null, 2) : null;
    } catch {
      detalleTexto = log.detalle ?? null;
    }
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-slate-400 text-xs whitespace-nowrap">
            {new Date(log.created_at).toLocaleString("es-AR", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Admin:</span>
          <span className="text-sm text-white">{log.admin_nombre ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Entidad:</span>
          <span className="text-sm font-mono text-slate-300">{log.entidad}</span>
        </div>
        {detalleTexto && (
          <p className="text-xs text-slate-400 line-clamp-2">{detalleTexto}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Auditoría de acciones</h1>
        <p className="text-sm text-slate-400">{total} registros</p>
      </div>

      {/* Filtro por acción */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/admin/auditoria"
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            !accionFiltro
              ? "bg-orange-500 text-slate-900"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Todas
        </a>
        {Object.entries(ACCION_LABELS).map(([key, { label }]) => (
          <a
            key={key}
            href={`/admin/auditoria?accion=${key}`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              accionFiltro === key
                ? "bg-orange-500 text-slate-900"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={logs}
        keyExtractor={(log) => log.id}
        caption="Registro de auditoría de acciones"
        emptyState={<p className="text-slate-400 text-sm">Sin registros todavía.</p>}
        renderCard={renderCard}
      />

      {totalPaginas > 1 && (
        <Pagination
          page={pagina}
          pageCount={totalPaginas}
          makeHref={(n) =>
            `/admin/auditoria?pagina=${n}${accionFiltro ? `&accion=${encodeURIComponent(accionFiltro)}` : ""}`
          }
        />
      )}

      <TutorialContextual
        section="auditoria"
        titulo="Guía rápida — Auditoría"
        steps={TUTORIAL_AUDITORIA}
      />
    </div>
  );
}

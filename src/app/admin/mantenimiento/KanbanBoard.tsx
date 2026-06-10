import Link from "next/link";
import { IniciarButton, ResolverButton, ReopenButton } from "./AccionesForm";

interface SolicitudKanban {
  id: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  creada_en: Date;
  resuelta_en: Date | null;
  cuenta: {
    descripcion: string;
    softguard_ref: string;
    perfil: { id: string; nombre: string; telefono: string | null };
  };
}

const PRIORIDAD_CONFIG: Record<string, { label: string; cls: string }> = {
  BAJA:  { label: "Baja",  cls: "text-slate-400" },
  MEDIA: { label: "Media", cls: "text-amber-400" },
  ALTA:  { label: "Alta",  cls: "text-red-400 font-semibold" },
};

const COLUMNS = [
  {
    key: "PENDIENTE",
    label: "Pendiente",
    borderCls: "border-amber-800/40",
    headCls: "text-amber-400",
    dotCls: "bg-amber-500",
  },
  {
    key: "EN_PROCESO",
    label: "En proceso",
    borderCls: "border-blue-800/40",
    headCls: "text-blue-400",
    dotCls: "bg-blue-500",
  },
  {
    key: "RESUELTA",
    label: "Resuelta",
    borderCls: "border-green-800/40",
    headCls: "text-green-400",
    dotCls: "bg-green-500",
  },
] as const;

const MAX_RESUELTA = 8;

export function KanbanBoard({ solicitudes }: { solicitudes: SolicitudKanban[] }) {
  const pendientes  = solicitudes.filter((s) => s.estado === "PENDIENTE");
  const enProceso   = solicitudes.filter((s) => s.estado === "EN_PROCESO");
  const resueltasAll = solicitudes.filter((s) => s.estado === "RESUELTA");
  const resueltas   = resueltasAll.slice(0, MAX_RESUELTA);

  const byEstado: Record<string, SolicitudKanban[]> = {
    PENDIENTE: pendientes,
    EN_PROCESO: enProceso,
    RESUELTA: resueltas,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const items = byEstado[col.key];
        return (
          <div
            key={col.key}
            className={`rounded-xl border ${col.borderCls} bg-slate-900/40`}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotCls}`} aria-hidden="true" />
              <span className={`text-xs font-bold uppercase tracking-wider ${col.headCls}`}>
                {col.label}
              </span>
              <span className="ml-auto text-xs text-slate-500 font-mono tabular-nums">
                {col.key === "RESUELTA" ? resueltasAll.length : items.length}
              </span>
            </div>

            <div className="p-3 space-y-3 min-h-[160px]">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-sm text-slate-600">
                  Sin solicitudes
                </div>
              ) : (
                items.map((s) => {
                  const prio = PRIORIDAD_CONFIG[s.prioridad] ?? {
                    label: s.prioridad,
                    cls: "text-slate-400",
                  };
                  return (
                    <div
                      key={s.id}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-3"
                    >
                      <Link
                        href={`/admin/clientes/${s.cuenta.perfil.id}`}
                        className="text-sm font-semibold text-white hover:text-orange-400 transition-colors block truncate"
                      >
                        {s.cuenta.perfil.nombre}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {s.cuenta.descripcion} · {s.cuenta.softguard_ref}
                      </p>
                      <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                        {s.descripcion}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${prio.cls}`}>{prio.label}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(s.creada_en).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      {s.cuenta.perfil.telefono && (
                        <a
                          href={`https://wa.me/549${s.cuenta.perfil.telefono.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-green-400 hover:text-green-300 transition-colors"
                        >
                          WhatsApp →
                        </a>
                      )}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {s.estado === "PENDIENTE" && (
                          <>
                            <IniciarButton id={s.id} />
                            <ResolverButton id={s.id} />
                          </>
                        )}
                        {s.estado === "EN_PROCESO" && <ResolverButton id={s.id} />}
                        {s.estado === "RESUELTA" && (
                          <div>
                            {s.resuelta_en && (
                              <p className="text-xs text-green-500 mb-1.5">
                                Resuelta el{" "}
                                {new Date(s.resuelta_en).toLocaleDateString("es-AR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            )}
                            <ReopenButton id={s.id} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {col.key === "RESUELTA" && resueltasAll.length > MAX_RESUELTA && (
                <p className="text-xs text-center text-slate-500 pt-1">
                  +{resueltasAll.length - MAX_RESUELTA} más ·{" "}
                  <Link
                    href="/admin/mantenimiento?estado=resueltas"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Ver todas →
                  </Link>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { IniciarButton, ResolverButton, ReopenButton } from "./AccionesForm";
import { NuevaSolicitudAdminDialog } from "@/components/admin/NuevaSolicitudAdminDialog";
import { KanbanBoard } from "./KanbanBoard";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { EmptyStateSuccess } from "@/components/admin/EmptyStateSuccess";
import { StagePipeline } from "@/components/admin/StagePipeline";
import { Wrench, Loader, CheckCircle2 } from "lucide-react";

const TUTORIAL_MANTENIMIENTO = [
  {
    titulo: "Vista lista vs kanban",
    descripcion: 'Podés ver las solicitudes en lista (con filtros) o en kanban (3 columnas por estado). El kanban es ideal para el seguimiento diario.',
  },
  {
    titulo: "Cambiar el estado",
    descripcion: '"En proceso" indica que ya están trabajando en la solicitud. "Resuelta" la cierra. Si fue error, podés reabrir.',
  },
  {
    titulo: "Prioridad",
    descripcion: "Alta (rojo) aparece primero. Podés contactar al cliente directo por WhatsApp desde cada card.",
  },
  {
    titulo: "Nueva solicitud",
    descripcion: 'El botón "+ Nueva solicitud" permite crear una desde el panel, sin que el cliente la cargue por el portal.',
  },
];

export const metadata: Metadata = { title: "Mantenimiento" };

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:   { label: "Pendiente",   cls: "bg-amber-900/40 text-amber-400 border-amber-800/40" },
  EN_PROCESO:  { label: "En proceso",  cls: "bg-blue-900/40 text-blue-400 border-blue-800/40" },
  RESUELTA:    { label: "Resuelta",    cls: "bg-green-900/40 text-green-400 border-green-800/40" },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; cls: string }> = {
  BAJA:  { label: "Baja",  cls: "text-slate-400" },
  MEDIA: { label: "Media", cls: "text-amber-400" },
  ALTA:  { label: "Alta",  cls: "text-red-400 font-semibold" },
};

export default async function MantenimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vista?: string }>;
}) {
  const sp = await searchParams;
  const filtroEstado = (sp.estado ?? "abiertas") as "abiertas" | "resueltas" | "todas";
  const vistaKanban = sp.vista === "kanban";

  const whereEstado =
    filtroEstado === "abiertas"
      ? { estado: { not: "RESUELTA" as const } }
      : filtroEstado === "resueltas"
      ? { estado: "RESUELTA" as const }
      : {};

  const solicitudes = await prisma.solicitudMantenimiento.findMany({
    where: whereEstado,
    include: {
      cuenta: {
        select: {
          id: true,
          descripcion: true,
          softguard_ref: true,
          perfil: { select: { id: true, nombre: true, telefono: true } },
        },
      },
    },
    orderBy: [
      { prioridad: "desc" },
      { creada_en: "asc" },
    ],
    take: 200,
  });

  const [countPendiente, countEnProceso, countResuelta, cuentasActivas] = await Promise.all([
    prisma.solicitudMantenimiento.count({ where: { estado: "PENDIENTE" } }),
    prisma.solicitudMantenimiento.count({ where: { estado: "EN_PROCESO" } }),
    prisma.solicitudMantenimiento.count({ where: { estado: "RESUELTA" } }),
    prisma.cuenta.findMany({
      where: { estado: { in: ["ACTIVA", "SUSPENDIDA_PAGO", "EN_MANTENIMIENTO"] } },
      select: {
        id: true,
        descripcion: true,
        softguard_ref: true,
        perfil: { select: { nombre: true } },
      },
      orderBy: [{ perfil: { nombre: "asc" } }, { descripcion: "asc" }],
    }),
  ]);

  const cuentaAbiertas = countPendiente + countEnProceso;

  const PIPELINE_STAGES = [
    {
      key: "pendiente",
      label: "Pendiente",
      count: countPendiente,
      href: "/admin/mantenimiento?estado=abiertas&etapa=pendiente",
      activeCls: "bg-amber-950/50 text-amber-300",
      countCls: "text-amber-300",
      icon: Wrench,
    },
    {
      key: "en_proceso",
      label: "En proceso",
      count: countEnProceso,
      href: "/admin/mantenimiento?estado=abiertas&etapa=en_proceso",
      activeCls: "bg-blue-950/50 text-blue-300",
      countCls: "text-blue-300",
      icon: Loader,
    },
    {
      key: "resuelta",
      label: "Resuelta",
      count: countResuelta,
      href: "/admin/mantenimiento?estado=resueltas",
      activeCls: "bg-emerald-950/50 text-emerald-300",
      countCls: "text-emerald-300",
      icon: CheckCircle2,
    },
  ] as const;

  const pipelineActiveKey =
    filtroEstado === "resueltas" ? "resuelta" :
    filtroEstado === "abiertas"  ? "pendiente" :
    "pendiente";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitudes de mantenimiento</h1>
          <p className="text-slate-400 text-sm mt-1">
            Asistencias técnicas solicitadas por los clientes.
          </p>
        </div>
        <NuevaSolicitudAdminDialog cuentas={cuentasActivas.map((c) => ({
          id: c.id,
          descripcion: c.descripcion,
          softguard_ref: c.softguard_ref,
          perfilNombre: c.perfil.nombre,
        }))} />
      </div>

      {/* Pipeline de etapas + toggle vista */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <StagePipeline
          stages={PIPELINE_STAGES}
          activeKey={pipelineActiveKey}
        />

        {/* Toggle vista */}
        <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/60 shrink-0">
          <Link
            href={`/admin/mantenimiento?estado=${filtroEstado}`}
            aria-label="Vista lista"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              !vistaKanban ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="0" y="1" width="12" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="0" y="5" width="12" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="0" y="9" width="12" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
            Lista
          </Link>
          <Link
            href={`/admin/mantenimiento?vista=kanban`}
            aria-label="Vista kanban"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              vistaKanban ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="0" y="0" width="3" height="12" rx="0.75" fill="currentColor"/>
              <rect x="4.5" y="0" width="3" height="12" rx="0.75" fill="currentColor"/>
              <rect x="9" y="0" width="3" height="12" rx="0.75" fill="currentColor"/>
            </svg>
            Kanban
          </Link>
        </div>
      </div>

      {vistaKanban ? (
        <KanbanBoard solicitudes={solicitudes} />
      ) : solicitudes.length === 0 ? (
        filtroEstado === "abiertas" ? (
          <EmptyStateSuccess
            titulo="Sin solicitudes abiertas"
            descripcion="Todas las solicitudes de mantenimiento están resueltas."
            cta={{ label: "Ver historial de resueltas", href: "/admin/mantenimiento?estado=resueltas" }}
          />
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
            <p className="text-slate-400">No hay solicitudes en esta categoría.</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => {
            const estado = ESTADO_CONFIG[s.estado] ?? { label: s.estado, cls: "bg-slate-700 text-slate-300 border-slate-600" };
            const prioridad = PRIORIDAD_CONFIG[s.prioridad] ?? { label: s.prioridad, cls: "text-slate-400" };

            return (
              <div key={s.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <Link
                      href={`/admin/clientes/${s.cuenta.perfil.id}`}
                      className="font-semibold text-white hover:text-orange-400 transition-colors"
                    >
                      {s.cuenta.perfil.nombre}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.cuenta.descripcion} · {s.cuenta.softguard_ref}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${estado.cls}`}>
                      {estado.label}
                    </span>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-slate-300 text-sm mb-3 leading-relaxed">{s.descripcion}</p>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4">
                  <span>
                    Prioridad:{" "}
                    <span className={prioridad.cls}>{prioridad.label}</span>
                  </span>
                  <span>
                    {new Date(s.creada_en).toLocaleDateString("es-AR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                  {s.cuenta.perfil.telefono && (
                    <a
                      href={`https://wa.me/549${s.cuenta.perfil.telefono.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      WhatsApp → {s.cuenta.perfil.telefono}
                    </a>
                  )}
                  {s.resuelta_en && (
                    <span className="text-green-500">
                      Resuelta el{" "}
                      {new Date(s.resuelta_en).toLocaleDateString("es-AR", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-4">
                  {s.estado === "PENDIENTE" && (
                    <>
                      <IniciarButton id={s.id} />
                      <ResolverButton id={s.id} />
                    </>
                  )}
                  {s.estado === "EN_PROCESO" && (
                    <ResolverButton id={s.id} />
                  )}
                  {s.estado === "RESUELTA" && (
                    <ReopenButton id={s.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TutorialContextual
        section="mantenimiento"
        titulo="Guía rápida — Mantenimiento"
        steps={TUTORIAL_MANTENIMIENTO}
      />
    </div>
  );
}

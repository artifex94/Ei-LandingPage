import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { NuevaOTButton } from "@/components/admin/ot/NuevaOTButton";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { StagePipeline } from "@/components/admin/StagePipeline";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Inbox, UserCheck, Truck, MapPin, CheckCircle2 } from "lucide-react";

const TUTORIAL_OT = [
  {
    titulo: "Qué es una Orden de Trabajo",
    descripcion: "Una OT es una visita técnica programada: instalación, correctivo, preventivo o retiro. Tiene técnico asignado y fecha de visita.",
  },
  {
    titulo: "Estados de la OT",
    descripcion: "Solicitada → Asignada (técnico definido) → En ruta → En sitio → Completada. El técnico actualiza el estado desde su panel.",
  },
  {
    titulo: "OTs vencidas",
    descripcion: "Las marcadas en rojo tienen fecha de visita pasada sin completarse. Contactá al técnico o reprogramá.",
  },
  {
    titulo: "Crear una OT",
    descripcion: 'El botón "+ Nueva OT" te permite crear una para cualquier cuenta activa. Asigná técnico y fecha de visita al crearla.',
  },
];

export const metadata: Metadata = { title: "Órdenes de Trabajo" };

const ESTADO_BADGE: Record<string, string> = {
  SOLICITADA:  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ASIGNADA:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  EN_RUTA:     "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  EN_SITIO:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  COMPLETADA:  "bg-slate-700 text-slate-400 border-slate-600",
  CANCELADA:   "bg-red-500/20 text-red-300 border-red-500/30",
};

const ESTADO_LABEL: Record<string, string> = {
  SOLICITADA: "Solicitada",
  ASIGNADA:   "Asignada",
  EN_RUTA:    "En ruta",
  EN_SITIO:   "En sitio",
  COMPLETADA: "Completada",
  CANCELADA:  "Cancelada",
};

const TIPO_LABEL: Record<string, string> = {
  INSTALACION: "Instalación",
  CORRECTIVO:  "Correctivo",
  PREVENTIVO:  "Preventivo",
  RETIRO:      "Retiro",
};

const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA:  "text-slate-400",
  MEDIA: "text-amber-400",
  ALTA:  "text-red-400",
};

export default async function OTListPage() {
  const [ots, completadas, countsByEstado] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where: { estado: { notIn: ["CANCELADA", "COMPLETADA"] } },
      include: {
        tecnico: { include: { perfil: { select: { nombre: true } } } },
        cuenta:  { select: { descripcion: true, perfil: { select: { nombre: true } } } },
        perfil:  { select: { nombre: true } },
      },
      orderBy: [{ estado: "asc" }, { fecha_visita: "asc" }, { created_at: "desc" }],
    }),
    prisma.ordenTrabajo.findMany({
      where: { estado: "COMPLETADA" },
      include: {
        tecnico: { include: { perfil: { select: { nombre: true } } } },
        cuenta:  { select: { descripcion: true, perfil: { select: { nombre: true } } } },
        perfil:  { select: { nombre: true } },
      },
      orderBy: { hora_fin: "desc" },
      take: 20,
    }),
    prisma.ordenTrabajo.groupBy({
      by: ["estado"],
      _count: { estado: true },
      where: { estado: { notIn: ["CANCELADA"] } },
    }),
  ]);

  const ahora = new Date();
  const hace3dias = new Date(); hace3dias.setDate(ahora.getDate() - 3);

  const activas = ots;

  const countFor = (e: string) =>
    countsByEstado.find((r) => r.estado === e)?._count.estado ?? 0;

  const OT_STAGES = [
    {
      key: "SOLICITADA",
      label: "Solicitada",
      count: countFor("SOLICITADA"),
      href: "/admin/ot",
      activeCls: "bg-amber-950/50 text-amber-300",
      countCls: "text-amber-300",
      icon: Inbox,
    },
    {
      key: "ASIGNADA",
      label: "Asignada",
      count: countFor("ASIGNADA"),
      href: "/admin/ot",
      activeCls: "bg-blue-950/50 text-blue-300",
      countCls: "text-blue-300",
      icon: UserCheck,
    },
    {
      key: "EN_RUTA",
      label: "En ruta",
      count: countFor("EN_RUTA"),
      href: "/admin/ot",
      activeCls: "bg-indigo-950/50 text-indigo-300",
      countCls: "text-indigo-300",
      icon: Truck,
    },
    {
      key: "EN_SITIO",
      label: "En sitio",
      count: countFor("EN_SITIO"),
      href: "/admin/ot",
      activeCls: "bg-violet-950/50 text-violet-300",
      countCls: "text-violet-300",
      icon: MapPin,
    },
    {
      key: "COMPLETADA",
      label: "Completada",
      count: countFor("COMPLETADA"),
      href: "/admin/ot",
      activeCls: "bg-emerald-950/50 text-emerald-300",
      countCls: "text-emerald-400",
      icon: CheckCircle2,
    },
  ] as const;

  // Active key: el estado más "en curso" del primer OT activo, o el primero con items
  const primerActivoEstado = activas[0]?.estado ?? "SOLICITADA";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Órdenes de Trabajo</h1>
          <p className="text-sm text-slate-400 mt-1">
            {activas.length} activa{activas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export?tipo=ots"
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-3 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors"
            title="Exportar OTs a Excel"
          >
            ↓ Excel
          </a>
          <NuevaOTButton />
        </div>
      </div>

      {/* Pipeline de estados */}
      <StagePipeline stages={OT_STAGES} activeKey={primerActivoEstado} />

      {/* Banner alertas */}
      {(() => {
        const vencidas   = activas.filter((o) => o.fecha_visita && new Date(o.fecha_visita) < ahora && !["EN_RUTA","EN_SITIO"].includes(o.estado));
        const sinAsignar = activas.filter((o) => o.estado === "SOLICITADA" && new Date(o.created_at) < hace3dias);
        if (vencidas.length === 0 && sinAsignar.length === 0) return null;
        return (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">Requieren atención</p>
            {vencidas.length > 0 && (
              <p className="text-xs text-amber-400">
                · {vencidas.length} OT{vencidas.length !== 1 ? "s" : ""} con fecha de visita vencida sin completar
              </p>
            )}
            {sinAsignar.length > 0 && (
              <p className="text-xs text-amber-400">
                · {sinAsignar.length} OT{sinAsignar.length !== 1 ? "s" : ""} sin asignar hace más de 3 días
              </p>
            )}
          </div>
        );
      })()}

      {/* Activas */}
      <OTTable ots={activas} titulo="Activas" ahora={ahora} />

      {/* Últimas completadas */}
      {completadas.length > 0 && (
        <OTTable ots={completadas} titulo="Últimas completadas" muted />
      )}
    </div>
  );
}

type OTRow = Awaited<ReturnType<typeof prisma.ordenTrabajo.findMany>>[number] & {
  tecnico: ({ perfil: { nombre: string } } & object) | null;
  cuenta: ({ descripcion: string; perfil: { nombre: string } } & object) | null;
  perfil: { nombre: string } | null;
};

function OTTable({ ots, titulo, muted = false, ahora }: { ots: OTRow[]; titulo: string; muted?: boolean; ahora?: Date }) {
  if (ots.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-10 text-center">
        <p className="text-slate-400">No hay OTs {titulo.toLowerCase()}.</p>
        {titulo === "Activas" && (
          <p className="text-xs text-slate-500 mt-1">Usá el botón &quot;Nueva OT&quot; para crear la primera.</p>
        )}
      </div>
    );
  }

  const isVencida = (ot: OTRow) =>
    Boolean(
      ahora &&
        ot.fecha_visita &&
        new Date(ot.fecha_visita) < ahora &&
        !["EN_RUTA", "EN_SITIO", "COMPLETADA", "CANCELADA"].includes(ot.estado),
    );

  const columns: Column<OTRow>[] = [
    {
      id: "numero",
      header: "Nº",
      cell: (ot) => (
        <span className="font-mono text-xs text-slate-400">#{String(ot.numero).padStart(4, "0")}</span>
      ),
    },
    {
      id: "tipo",
      header: "Tipo / Cliente",
      cell: (ot) => {
        const clienteNombre = ot.cuenta?.perfil.nombre ?? ot.perfil?.nombre ?? "—";
        return (
          <>
            <p className="font-medium text-white">{TIPO_LABEL[ot.tipo] ?? ot.tipo}</p>
            <p className="text-xs text-slate-400">{clienteNombre}</p>
            {ot.cuenta && <p className="text-xs text-slate-500">{ot.cuenta.descripcion}</p>}
          </>
        );
      },
    },
    {
      id: "tecnico",
      header: "Técnico",
      cell: (ot) => (
        <span className="text-slate-300 text-xs">
          {ot.tecnico?.perfil.nombre ?? <span className="text-slate-500">Sin asignar</span>}
        </span>
      ),
    },
    {
      id: "fecha",
      header: "Fecha",
      cell: (ot) => {
        const vencida = isVencida(ot);
        return (
          <span className={`text-xs ${vencida ? "text-red-400 font-medium" : "text-slate-400"}`}>
            {ot.fecha_visita ? (
              new Date(ot.fecha_visita).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
            ) : (
              <span className="text-slate-500">—</span>
            )}
            {vencida && <span className="block text-red-500 text-xs">vencida</span>}
          </span>
        );
      },
    },
    {
      id: "estado",
      header: "Estado",
      cell: (ot) => (
        <>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_BADGE[ot.estado] ?? ""}`}>
            {ESTADO_LABEL[ot.estado] ?? ot.estado}
          </span>
          <span className={`block text-xs mt-0.5 ${PRIORIDAD_COLOR[ot.prioridad]}`}>
            {ot.prioridad.toLowerCase()}
          </span>
        </>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      cell: (ot) => (
        <Link
          href={`/admin/ot/${ot.id}`}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
        >
          Ver →
        </Link>
      ),
    },
  ];

  const renderCard = (ot: OTRow) => {
    const clienteNombre = ot.cuenta?.perfil.nombre ?? ot.perfil?.nombre ?? "—";
    const vencida = isVencida(ot);
    return (
      <Link
        href={`/admin/ot/${ot.id}`}
        className={`block rounded-lg border px-4 py-3 transition-colors ${
          vencida
            ? "bg-red-950/30 border-red-800/50 hover:bg-red-900/20"
            : "bg-slate-800 border-slate-700 hover:bg-slate-700/60"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="font-medium text-white text-sm">
              {TIPO_LABEL[ot.tipo] ?? ot.tipo}
              <span className="font-mono text-xs text-slate-500 ml-2">
                #{String(ot.numero).padStart(4, "0")}
              </span>
            </p>
            <p className="text-xs text-slate-400 truncate">{clienteNombre}</p>
            {ot.cuenta && <p className="text-xs text-slate-500 truncate">{ot.cuenta.descripcion}</p>}
          </div>
          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_BADGE[ot.estado] ?? ""}`}>
            {ESTADO_LABEL[ot.estado] ?? ot.estado}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {ot.tecnico?.perfil.nombre ?? <span className="text-slate-500">Sin asignar</span>}
          </span>
          <span className={vencida ? "text-red-400 font-medium" : "text-slate-500"}>
            {ot.fecha_visita
              ? new Date(ot.fecha_visita).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
              : "—"}
            {vencida && " · vencida"}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <section className="space-y-3">
      <h2 className={`text-sm font-semibold uppercase tracking-wider ${muted ? "text-slate-500" : "text-slate-300"}`}>
        {titulo}
      </h2>

      <DataTable
        columns={columns}
        rows={ots}
        keyExtractor={(ot) => ot.id}
        caption={`Órdenes de trabajo — ${titulo}`}
        renderCard={renderCard}
        rowClassName={(ot) =>
          isVencida(ot) ? "bg-red-950/30 hover:bg-red-900/20" : "bg-slate-900 hover:bg-slate-800/50"
        }
      />

      <TutorialContextual
        section="ot"
        titulo="Guía rápida — Órdenes de Trabajo"
        steps={TUTORIAL_OT}
      />
    </section>
  );
}

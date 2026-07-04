import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, CalendarCheck, Truck, MapPin, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalSection } from "@/components/portal/PortalSection";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Mis solicitudes" };

const ESTADO_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDIENTE:  { label: "Pendiente",  variant: "warning" },
  EN_PROCESO: { label: "En proceso", variant: "info" },
  RESUELTA:   { label: "Resuelta",   variant: "success" },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; cls: string }> = {
  BAJA:  { label: "Baja",  cls: "text-slate-400" },
  MEDIA: { label: "Media", cls: "text-amber-400" },
  ALTA:  { label: "Alta",  cls: "text-red-400" },
};

export default async function SolicitudesPage() {
  const { userId } = await requireSesion();

  const solicitudes = await prisma.solicitudMantenimiento.findMany({
    where: { cuenta: { perfil_id: userId } },
    include: {
      cuenta: { select: { id: true, descripcion: true } },
      // Progreso real de la visita cuando la solicitud se promovió a OT:
      // solo lo que el cliente puede ver (estado, fecha, técnico) — nunca
      // notas internas ni costos.
      ot: {
        select: {
          estado: true,
          fecha_visita: true,
          tecnico: { select: { perfil: { select: { nombre: true } } } },
        },
      },
    },
    orderBy: { creada_en: "desc" },
    take: 60,
  });

  const abiertas = solicitudes.filter((s) => s.estado !== "RESUELTA");
  const resueltas = solicitudes.filter((s) => s.estado === "RESUELTA");

  return (
    <section className="space-y-7" aria-labelledby="solicitudes-heading">
      <PortalPageHeader
        eyebrow="Asistencia"
        title="Mis solicitudes"
        titleId="solicitudes-heading"
        description="Historial de asistencia técnica solicitada."
        action={
          <Link
            href="/portal/solicitud"
            className="portal-action portal-action-primary shrink-0"
          >
            + Nueva solicitud
          </Link>
        }
      />

      {solicitudes.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No tenés solicitudes registradas."
          action={{ label: "Solicitar asistencia", href: "/portal/solicitud" }}
        />
      ) : (
        <>
          {/* Solicitudes abiertas */}
          {abiertas.length > 0 && (
            <PortalSection title="Abiertas" ledClass="bg-amber-400" meta={abiertas.length}>
              <div className="space-y-2">
                {abiertas.map((s) => (
                  <SolicitudCard key={s.id} s={s} />
                ))}
              </div>
            </PortalSection>
          )}

          {/* Solicitudes resueltas */}
          {resueltas.length > 0 && (
            <PortalSection title="Resueltas" ledClass="bg-slate-600" meta={resueltas.length}>
              <div className="space-y-2">
                {resueltas.map((s) => (
                  <SolicitudCard key={s.id} s={s} />
                ))}
              </div>
            </PortalSection>
          )}
        </>
      )}
    </section>
  );
}

// ── Progreso de la visita técnica (cuando la solicitud se promovió a OT) ─────
// Traducción del estado interno de la OT al lenguaje del cliente, con triple
// canal (color + icono + texto). CANCELADA no muestra franja: la solicitud
// vuelve a gestionarse y su propio estado ya lo comunica.

const PROGRESO_OT: Record<string, { label: string; icon: LucideIcon; cls: string; ledCls: string; activo: boolean }> = {
  SOLICITADA: { label: "Visita en evaluación",     icon: CalendarCheck, cls: "text-slate-300",   ledCls: "bg-slate-400",   activo: false },
  ASIGNADA:   { label: "Visita programada",        icon: CalendarCheck, cls: "text-sky-300",     ledCls: "bg-sky-400",     activo: false },
  EN_RUTA:    { label: "Técnico en camino",        icon: Truck,         cls: "text-emerald-300", ledCls: "bg-emerald-400", activo: true },
  EN_SITIO:   { label: "Técnico en tu domicilio",  icon: MapPin,        cls: "text-emerald-300", ledCls: "bg-emerald-400", activo: true },
  COMPLETADA: { label: "Visita completada",        icon: CheckCircle2,  cls: "text-emerald-400", ledCls: "bg-emerald-500", activo: false },
};

interface OTProgreso {
  estado: string;
  fecha_visita: Date | null;
  tecnico: { perfil: { nombre: string } } | null;
}

function ProgresoVisita({ ot }: { ot: OTProgreso }) {
  const cfg = PROGRESO_OT[ot.estado];
  if (!cfg) return null;

  const Icon = cfg.icon;
  const detalle: string[] = [];
  if (ot.tecnico) detalle.push(ot.tecnico.perfil.nombre.split(" ")[0]);
  if (ot.fecha_visita) {
    detalle.push(
      new Date(ot.fecha_visita).toLocaleDateString("es-AR", {
        weekday: "long", day: "numeric", month: "long",
      }),
    );
  }

  return (
    <p className="mt-2 flex items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2 text-xs">
      <span
        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.ledCls} ${cfg.activo ? "animate-pulse" : ""}`}
        aria-hidden="true"
      />
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.cls}`} aria-hidden="true" />
      <span className={`font-semibold ${cfg.cls}`}>{cfg.label}</span>
      {detalle.length > 0 && (
        <span className="text-slate-400 capitalize">· {detalle.join(" · ")}</span>
      )}
    </p>
  );
}

function SolicitudCard({
  s,
}: {
  s: {
    id: string;
    descripcion: string;
    estado: string;
    prioridad: string;
    creada_en: Date;
    resuelta_en: Date | null;
    cuenta: { id: string; descripcion: string };
    ot: OTProgreso | null;
  };
}) {
  const estado = ESTADO_CONFIG[s.estado] ?? { label: s.estado, variant: "neutral" as BadgeVariant };
  const prioridad = PRIORIDAD_CONFIG[s.prioridad] ?? { label: s.prioridad, cls: "text-slate-400" };

  return (
    <div className="portal-row px-4 py-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <Link
            href={`/portal/cuentas/${s.cuenta.id}`}
            className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors"
          >
            {s.cuenta.descripcion}
          </Link>
          <p className="text-sm text-white font-medium mt-0.5 leading-snug">{s.descripcion}</p>
        </div>
        <Badge variant={estado.variant} className="shrink-0">{estado.label}</Badge>
      </div>

      {s.ot && s.estado !== "RESUELTA" && <ProgresoVisita ot={s.ot} />}

      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
        <span>
          Prioridad:{" "}
          <span className={`font-medium ${prioridad.cls}`}>{prioridad.label}</span>
        </span>
        <span className="font-mono tabular-nums">
          {new Date(s.creada_en).toLocaleDateString("es-AR", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
        {s.resuelta_en && (
          <span className="text-emerald-500">
            Resuelta el{" "}
            {new Date(s.resuelta_en).toLocaleDateString("es-AR", {
              day: "numeric", month: "short",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

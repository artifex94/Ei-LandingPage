import type { Metadata } from "next";
import Link from "next/link";
import { Wrench } from "lucide-react";
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
    include: { cuenta: { select: { id: true, descripcion: true } } },
    orderBy: { creada_en: "desc" },
    take: 60,
  });

  const abiertas = solicitudes.filter((s) => s.estado !== "RESUELTA");
  const resueltas = solicitudes.filter((s) => s.estado === "RESUELTA");

  return (
    <section className="space-y-7" aria-labelledby="solicitudes-heading">
      <PortalPageHeader
        title="Mis solicitudes"
        titleId="solicitudes-heading"
        description="Historial de asistencia técnica solicitada."
        action={
          <Link
            href="/portal/solicitud"
            className="shrink-0 bg-tactical-500 hover:bg-tactical-400 border border-tactical-600 border-b-[3px] border-b-tactical-600 active:border-b active:translate-y-[2px] text-slate-900 font-bold uppercase tracking-widest px-5 py-2.5 rounded-sm min-h-[48px] text-xs flex items-center gap-2 transition-all duration-150 ease-mech-press"
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
  };
}) {
  const estado = ESTADO_CONFIG[s.estado] ?? { label: s.estado, variant: "neutral" as BadgeVariant };
  const prioridad = PRIORIDAD_CONFIG[s.prioridad] ?? { label: s.prioridad, cls: "text-slate-400" };

  return (
    <div className="rounded-md border border-industrial-700 bg-industrial-800/60 hover:bg-industrial-800 transition-colors px-4 py-3">
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

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { SolicitarOTButton } from "@/components/portal/SolicitarOTButton";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalSection } from "@/components/portal/PortalSection";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Soporte" };

// ── Configuraciones de display ────────────────────────────────────────────────

const OT_ESTADO_VARIANT: Record<string, BadgeVariant> = {
  SOLICITADA: "warning",
  ASIGNADA:   "info",
  EN_RUTA:    "info",
  EN_SITIO:   "success",
  COMPLETADA: "neutral",
  CANCELADA:  "danger",
};
const OT_ESTADO_LABEL: Record<string, string> = {
  SOLICITADA: "Recibida",
  ASIGNADA:   "Técnico asignado",
  EN_RUTA:    "Técnico en camino",
  EN_SITIO:   "Técnico en tu domicilio",
  COMPLETADA: "Completada",
  CANCELADA:  "Cancelada",
};
const OT_TIPO_LABEL: Record<string, string> = {
  INSTALACION: "Instalación", CORRECTIVO: "Correctivo",
  PREVENTIVO:  "Preventivo",  RETIRO: "Retiro",
};
const SOL_ESTADO: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDIENTE:  { label: "Pendiente",  variant: "warning" },
  EN_PROCESO: { label: "En proceso", variant: "info" },
  RESUELTA:   { label: "Resuelta",   variant: "success" },
};
const SOL_PRIORIDAD: Record<string, string> = {
  BAJA: "text-slate-400", MEDIA: "text-amber-400", ALTA: "text-red-400",
};

const OT_ACTIVOS = ["SOLICITADA", "ASIGNADA", "EN_RUTA", "EN_SITIO"];

// ── Página ────────────────────────────────────────────────────────────────────

export default async function SoportePage() {
  const { userId } = await requireSesion();

  const [cuentas, solicitudesRaw, ots] = await Promise.all([
    prisma.cuenta.findMany({
      where: { perfil_id: userId, estado: { not: "BAJA_DEFINITIVA" } },
      select: { id: true, descripcion: true },
      orderBy: { descripcion: "asc" },
    }),
    prisma.solicitudMantenimiento.findMany({
      where: { cuenta: { perfil_id: userId } },
      include: { cuenta: { select: { id: true, descripcion: true } } },
      orderBy: { creada_en: "desc" },
      take: 60,
    }),
    prisma.ordenTrabajo.findMany({
      where: {
        OR: [
          { perfil_id: userId },
          { cuenta: { perfil_id: userId } },
        ],
      },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
  ]);

  const otsActivas   = ots.filter((o) => OT_ACTIVOS.includes(o.estado));
  const otsHistorial = ots.filter((o) => !OT_ACTIVOS.includes(o.estado));
  const solAbiertas  = solicitudesRaw.filter((s) => s.estado !== "RESUELTA");
  const solResueltas = solicitudesRaw.filter((s) => s.estado === "RESUELTA");

  const hayActividad = otsActivas.length > 0 || solAbiertas.length > 0;

  return (
    <section className="space-y-7" aria-labelledby="soporte-heading">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <PortalPageHeader
        eyebrow="Mi Central"
        title="Asistencia"
        titleId="soporte-heading"
        description="Pedí ayuda y seguí cada visita técnica."
        action={<SolicitarOTButton cuentas={cuentas} perfil_id={userId} />}
      />

      <aside className="portal-panel grid grid-cols-1 min-h-[150px] overflow-hidden sm:grid-cols-[1fr_240px]" aria-label="Atención local">
        <div className="flex flex-col justify-center p-5 sm:p-6">
          <p className="text-base font-semibold text-white">Atención local, seguimiento claro.</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
            Si ya pediste asistencia, su avance aparece acá.
          </p>
        </div>
        <div className="relative min-h-[150px] border-t border-industrial-700/60 sm:border-l sm:border-t-0">
          <Image
            src="/images/monitoreo-local.webp"
            alt="Operadora de la central brindando asistencia"
            fill
            sizes="(max-width: 640px) 100vw, 240px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-industrial-900/25 to-transparent" aria-hidden="true" />
        </div>
      </aside>

      {/* ── Sin actividad ──────────────────────────────────────────────────── */}
      {!hayActividad && ots.length === 0 && solicitudesRaw.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="No tenés solicitudes ni visitas registradas."
          description='Usá el botón "Solicitar servicio" si necesitás asistencia técnica.'
        />
      )}

      {/* ── Visitas activas ─────────────────────────────────────────────────── */}
      {otsActivas.length > 0 && (
        <PortalSection title="Visitas en curso" ledClass="bg-sky-400 animate-led-idle">
          <div className="space-y-2">
            {otsActivas.map((ot) => (
              <OTCard key={ot.id} ot={ot} destacada />
            ))}
          </div>
        </PortalSection>
      )}

      {/* ── Solicitudes abiertas ────────────────────────────────────────────── */}
      {solAbiertas.length > 0 && (
        <PortalSection title="Solicitudes abiertas" ledClass="bg-amber-400">
          <div className="space-y-2">
            {solAbiertas.map((s) => (
              <SolicitudCard key={s.id} s={s} />
            ))}
          </div>
        </PortalSection>
      )}

      {/* ── Historial ───────────────────────────────────────────────────────── */}
      {(otsHistorial.length > 0 || solResueltas.length > 0) && (
        <PortalSection title="Historial" ledClass="bg-slate-600">
          <div className="space-y-2">
            {/* OTs completadas/canceladas */}
            {otsHistorial.map((ot) => (
              <OTCard key={ot.id} ot={ot} destacada={false} />
            ))}
            {/* Solicitudes resueltas */}
            {solResueltas.map((s) => (
              <SolicitudCard key={s.id} s={s} />
            ))}
          </div>
        </PortalSection>
      )}
    </section>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

type OT = {
  id: string;
  numero: number;
  tipo: string;
  descripcion: string;
  estado: string;
  fecha_visita: Date | null;
  created_at: Date;
  conformidad_firmada: boolean;
};

function OTCard({ ot, destacada }: { ot: OT; destacada: boolean }) {
  const variant = OT_ESTADO_VARIANT[ot.estado] ?? "neutral";
  const label   = OT_ESTADO_LABEL[ot.estado] ?? ot.estado;
  const tipo    = OT_TIPO_LABEL[ot.tipo] ?? ot.tipo;

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition-colors ${
        destacada
          ? "bg-sky-950/40 border-sky-800/60"
          : "bg-industrial-800/45 border-industrial-700/70 hover:bg-industrial-800/75"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">
              #{String(ot.numero).padStart(4, "0")}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {tipo}
            </span>
          </div>
          <p className={`text-sm font-medium leading-snug ${destacada ? "text-white" : "text-slate-200"}`}>
            {ot.descripcion}
          </p>
          {ot.fecha_visita && (
            <p className="text-xs text-slate-400 mt-1.5">
              Visita:{" "}
              <span className={`font-mono tabular-nums${destacada ? " text-sky-300 font-medium" : ""}`}>
                {new Date(ot.fecha_visita).toLocaleString("es-AR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </p>
          )}
        </div>
        <Badge variant={variant} className="shrink-0">{label}</Badge>
      </div>
      {ot.estado === "COMPLETADA" && ot.conformidad_firmada && (
        <p className="text-xs text-emerald-500 mt-2">✓ Conformidad firmada</p>
      )}
    </div>
  );
}

type Solicitud = {
  id: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  creada_en: Date;
  resuelta_en: Date | null;
  cuenta: { id: string; descripcion: string };
};

function SolicitudCard({ s }: { s: Solicitud }) {
  const estado    = SOL_ESTADO[s.estado] ?? { label: s.estado, variant: "neutral" as BadgeVariant };
  const prioColor = SOL_PRIORIDAD[s.prioridad] ?? "text-slate-400";

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
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>
          Prioridad:{" "}
          <span className={`font-medium ${prioColor}`}>{s.prioridad.charAt(0) + s.prioridad.slice(1).toLowerCase()}</span>
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

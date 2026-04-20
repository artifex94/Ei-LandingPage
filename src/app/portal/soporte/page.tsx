import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { SolicitarOTButton } from "@/components/portal/SolicitarOTButton";

export const metadata: Metadata = { title: "Soporte — Portal" };

// ── Configuraciones de display ────────────────────────────────────────────────

const OT_ESTADO_BADGE: Record<string, string> = {
  SOLICITADA: "bg-amber-500/20 text-amber-300",
  ASIGNADA:   "bg-blue-500/20 text-blue-300",
  EN_RUTA:    "bg-indigo-500/20 text-indigo-300",
  EN_SITIO:   "bg-emerald-500/20 text-emerald-300",
  COMPLETADA: "bg-slate-700 text-slate-400",
  CANCELADA:  "bg-red-500/20 text-red-300",
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
const SOL_ESTADO: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-900/40 text-amber-400" },
  EN_PROCESO: { label: "En proceso", cls: "bg-blue-900/40 text-blue-400" },
  RESUELTA:   { label: "Resuelta",   cls: "bg-green-900/40 text-green-400" },
};
const SOL_PRIORIDAD: Record<string, string> = {
  BAJA: "text-slate-400", MEDIA: "text-amber-400", ALTA: "text-red-400",
};

const OT_ACTIVOS = ["SOLICITADA", "ASIGNADA", "EN_RUTA", "EN_SITIO"];

// ── Página ────────────────────────────────────────────────────────────────────

export default async function SoportePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: user.id, estado: { not: "BAJA_DEFINITIVA" } },
    select: { id: true, descripcion: true },
    orderBy: { descripcion: "asc" },
  });

  const [solicitudesRaw, otsRaw1, otsRaw2] = await Promise.all([
    prisma.solicitudMantenimiento.findMany({
      where: { cuenta: { perfil_id: user.id } },
      include: { cuenta: { select: { id: true, descripcion: true } } },
      orderBy: { creada_en: "desc" },
    }),
    prisma.ordenTrabajo.findMany({
      where: { perfil_id: user.id },
      orderBy: { created_at: "desc" },
    }),
    prisma.ordenTrabajo.findMany({
      where: { cuenta: { perfil_id: user.id } },
      orderBy: { created_at: "desc" },
    }),
  ]);

  // Deduplicar OTs
  const otsMap = new Map<string, (typeof otsRaw1)[0]>();
  [...otsRaw1, ...otsRaw2].forEach((o) => otsMap.set(o.id, o));
  const ots = [...otsMap.values()].sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  );

  const otsActivas   = ots.filter((o) => OT_ACTIVOS.includes(o.estado));
  const otsHistorial = ots.filter((o) => !OT_ACTIVOS.includes(o.estado));
  const solAbiertas  = solicitudesRaw.filter((s) => s.estado !== "RESUELTA");
  const solResueltas = solicitudesRaw.filter((s) => s.estado === "RESUELTA");

  const hayActividad = otsActivas.length > 0 || solAbiertas.length > 0;

  return (
    <section className="space-y-10" aria-labelledby="soporte-heading">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 id="soporte-heading" className="text-2xl font-bold text-white">
            Soporte
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tus solicitudes de asistencia y visitas técnicas.
          </p>
        </div>
        <SolicitarOTButton cuentas={cuentas} perfil_id={user.id} />
      </div>

      {/* ── Sin actividad ──────────────────────────────────────────────────── */}
      {!hayActividad && ots.length === 0 && solicitudesRaw.length === 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
          <p className="text-slate-400 mb-4">No tenés solicitudes ni visitas registradas.</p>
          <p className="text-slate-500 text-sm">
            Usá el botón <span className="text-white font-medium">"Solicitar servicio"</span> si necesitás asistencia técnica.
          </p>
        </div>
      )}

      {/* ── Visitas activas ─────────────────────────────────────────────────── */}
      {otsActivas.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-sky-400 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" aria-hidden="true" />
            Visitas en curso
          </h2>
          <div className="space-y-3">
            {otsActivas.map((ot) => (
              <OTCard key={ot.id} ot={ot} destacada />
            ))}
          </div>
        </div>
      )}

      {/* ── Solicitudes abiertas ────────────────────────────────────────────── */}
      {solAbiertas.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            Solicitudes abiertas
          </h2>
          <div className="space-y-3">
            {solAbiertas.map((s) => (
              <SolicitudCard key={s.id} s={s} />
            ))}
          </div>
        </div>
      )}

      {/* ── Historial ───────────────────────────────────────────────────────── */}
      {(otsHistorial.length > 0 || solResueltas.length > 0) && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" aria-hidden="true" />
            Historial
          </h2>
          <div className="space-y-3">
            {/* OTs completadas/canceladas */}
            {otsHistorial.map((ot) => (
              <OTCard key={ot.id} ot={ot} destacada={false} />
            ))}
            {/* Solicitudes resueltas */}
            {solResueltas.map((s) => (
              <SolicitudCard key={s.id} s={s} />
            ))}
          </div>
        </div>
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
  const badge  = OT_ESTADO_BADGE[ot.estado] ?? "bg-slate-700 text-slate-400";
  const label  = OT_ESTADO_LABEL[ot.estado] ?? ot.estado;
  const tipo   = OT_TIPO_LABEL[ot.tipo] ?? ot.tipo;

  return (
    <div
      className={`rounded-xl border px-5 py-4 transition-colors ${
        destacada
          ? "bg-sky-950/40 border-sky-800/60"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">
              #{String(ot.numero).padStart(4, "0")}
            </span>
            <span className="text-xs text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded">
              {tipo}
            </span>
          </div>
          <p className={`font-medium leading-snug ${destacada ? "text-white" : "text-slate-200"}`}>
            {ot.descripcion}
          </p>
          {ot.fecha_visita && (
            <p className="text-xs text-slate-400 mt-1.5">
              Visita:{" "}
              <span className={destacada ? "text-sky-300 font-medium" : ""}>
                {new Date(ot.fecha_visita).toLocaleString("es-AR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badge}`}>
          {label}
        </span>
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
  const estado    = SOL_ESTADO[s.estado] ?? { label: s.estado, cls: "bg-slate-700 text-slate-300" };
  const prioColor = SOL_PRIORIDAD[s.prioridad] ?? "text-slate-400";

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <Link
            href={`/portal/cuentas/${s.cuenta.id}`}
            className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors"
          >
            {s.cuenta.descripcion}
          </Link>
          <p className="text-white font-medium mt-0.5 leading-snug">{s.descripcion}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${estado.cls}`}>
          {estado.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>
          Prioridad:{" "}
          <span className={`font-medium ${prioColor}`}>{s.prioridad.charAt(0) + s.prioridad.slice(1).toLowerCase()}</span>
        </span>
        <span>
          {new Date(s.creada_en).toLocaleDateString("es-AR", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
        {s.resuelta_en && (
          <span className="text-green-500">
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

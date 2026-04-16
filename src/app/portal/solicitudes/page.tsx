import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:   { label: "Pendiente",   cls: "bg-amber-900/40 text-amber-400" },
  EN_PROCESO:  { label: "En proceso",  cls: "bg-blue-900/40 text-blue-400" },
  RESUELTA:    { label: "Resuelta",    cls: "bg-green-900/40 text-green-400" },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; cls: string }> = {
  BAJA:  { label: "Baja",  cls: "text-slate-400" },
  MEDIA: { label: "Media", cls: "text-amber-400" },
  ALTA:  { label: "Alta",  cls: "text-red-400" },
};

export default async function SolicitudesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const solicitudes = await prisma.solicitudMantenimiento.findMany({
    where: { cuenta: { perfil_id: user.id } },
    include: { cuenta: { select: { id: true, descripcion: true } } },
    orderBy: { creada_en: "desc" },
  });

  const abiertas = solicitudes.filter((s) => s.estado !== "RESUELTA");
  const resueltas = solicitudes.filter((s) => s.estado === "RESUELTA");

  return (
    <section className="space-y-8" aria-labelledby="solicitudes-heading">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 id="solicitudes-heading" className="text-2xl font-bold text-white">
            Mis solicitudes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Historial de asistencia técnica solicitada.
          </p>
        </div>
        <Link
          href="/portal/solicitud"
          className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-3 rounded-lg min-h-[48px] text-sm flex items-center gap-2 transition-colors"
        >
          + Nueva solicitud
        </Link>
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
          <p className="text-slate-400 mb-4">No tenés solicitudes registradas.</p>
          <Link
            href="/portal/solicitud"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Solicitar asistencia
          </Link>
        </div>
      ) : (
        <>
          {/* Solicitudes abiertas */}
          {abiertas.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-300 mb-3">
                Abiertas ({abiertas.length})
              </h2>
              <div className="space-y-3">
                {abiertas.map((s) => (
                  <SolicitudCard key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}

          {/* Solicitudes resueltas */}
          {resueltas.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-300 mb-3">
                Resueltas ({resueltas.length})
              </h2>
              <div className="space-y-3">
                {resueltas.map((s) => (
                  <SolicitudCard key={s.id} s={s} />
                ))}
              </div>
            </div>
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
  const estado = ESTADO_CONFIG[s.estado] ?? { label: s.estado, cls: "bg-slate-700 text-slate-300" };
  const prioridad = PRIORIDAD_CONFIG[s.prioridad] ?? { label: s.prioridad, cls: "text-slate-400" };

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

      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
        <span>
          Prioridad:{" "}
          <span className={`font-medium ${prioridad.cls}`}>{prioridad.label}</span>
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

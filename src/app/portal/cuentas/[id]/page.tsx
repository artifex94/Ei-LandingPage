import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { SensorItem } from "@/components/portal/SensorItem";

// ─── Panel de estado del sistema ──────────────────────────────────────────────

function PanelEstado({
  sensores,
}: {
  sensores: {
    id: string;
    activa: boolean;
    bateria: string | null;
    alerta_mant: boolean;
    ultima_activacion: Date | null;
  }[];
}) {
  if (sensores.length === 0) return null;

  const activos = sensores.filter((s) => s.activa).length;
  const bateriaCritica = sensores.filter((s) => s.bateria === "CRITICA").length;
  const bateriaAdvertencia = sensores.filter((s) => s.bateria === "ADVERTENCIA").length;
  const enMantenimiento = sensores.filter((s) => s.alerta_mant).length;

  // Última activación de cualquier sensor
  const fechas = sensores
    .map((s) => s.ultima_activacion)
    .filter((f): f is Date => f !== null)
    .sort((a, b) => b.getTime() - a.getTime());
  const ultimaActivacion = fechas[0] ?? null;

  // Estado general
  const hayProblemas = bateriaCritica > 0 || enMantenimiento > 0;
  const hayAdvertencias = bateriaAdvertencia > 0;

  const estadoLabel = hayProblemas ? "Atención requerida" : hayAdvertencias ? "Atención sugerida" : "Sin alertas";
  const estadoCls   = hayProblemas ? "bg-red-900/30 border-red-800 text-red-400" : hayAdvertencias ? "bg-yellow-900/30 border-yellow-800 text-yellow-400" : "bg-green-900/30 border-green-800 text-green-400";
  const estadoIcon  = hayProblemas ? "⚠" : hayAdvertencias ? "◎" : "✓";

  function tiempoRelativo(fecha: Date): string {
    const diff = Date.now() - fecha.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)   return "hace instantes";
    if (min < 60)  return `hace ${min} min`;
    const hs = Math.floor(min / 60);
    if (hs < 24)   return `hace ${hs}h`;
    const dias = Math.floor(hs / 24);
    if (dias === 1) return "ayer";
    if (dias < 30)  return `hace ${dias} días`;
    return fecha.toLocaleDateString("es-AR");
  }

  return (
    <div className={`rounded-xl border px-5 py-4 ${estadoCls}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-semibold text-sm">
          {estadoIcon} {estadoLabel}
        </p>
        <span className="text-xs opacity-70">
          {activos}/{sensores.length} dispositivos activos
        </span>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs opacity-80">
        {ultimaActivacion && (
          <span>Última activación: {tiempoRelativo(ultimaActivacion)}</span>
        )}
        {bateriaCritica > 0 && (
          <span>🔴 {bateriaCritica} batería{bateriaCritica > 1 ? "s" : ""} crítica{bateriaCritica > 1 ? "s" : ""}</span>
        )}
        {bateriaAdvertencia > 0 && (
          <span>🟡 {bateriaAdvertencia} batería{bateriaAdvertencia > 1 ? "s" : ""} baja{bateriaAdvertencia > 1 ? "s" : ""}</span>
        )}
        {enMantenimiento > 0 && (
          <span>🔧 {enMantenimiento} dispositivo{enMantenimiento > 1 ? "s" : ""} con alerta de mantenimiento</span>
        )}
        {!hayProblemas && !hayAdvertencias && (
          <span>Todos los dispositivos funcionando correctamente</span>
        )}
      </div>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default async function CuentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cuenta = await prisma.cuenta.findFirst({
    where: { id, perfil_id: user.id },
    include: {
      sensores: { orderBy: { codigo_zona: "asc" } },
      pagos: {
        where: { anio: new Date().getFullYear() },
        orderBy: { mes: "desc" },
      },
      solicitudes: {
        where: { estado: { not: "RESUELTA" } },
        orderBy: { creada_en: "desc" },
        take: 3,
      },
    },
  });

  if (!cuenta) notFound();

  const pagoPendiente = cuenta.pagos.find(
    (p) => p.estado === "PENDIENTE" || p.estado === "VENCIDO"
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/portal/dashboard" className="hover:text-white min-h-[44px] inline-flex items-center transition-colors">
              Mis servicios
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium truncate max-w-[200px]">
            {cuenta.descripcion}
          </li>
        </ol>
      </nav>

      {/* Encabezado */}
      <section aria-labelledby="cuenta-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 id="cuenta-heading" className="text-2xl font-bold text-white">
              {cuenta.descripcion}
            </h1>
            <p className="text-slate-400 mt-1">
              Ref. Softguard: {cuenta.softguard_ref}
            </p>
          </div>

          {pagoPendiente && (
            <Link
              href="/portal/pagos"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-semibold min-h-[48px] text-sm transition-colors"
            >
              ⚠ Pagar ahora — ${Number(pagoPendiente.importe).toLocaleString("es-AR")}
            </Link>
          )}
        </div>
      </section>

      {/* Panel de estado del sistema */}
      {cuenta.sensores.length > 0 && (
        <PanelEstado sensores={cuenta.sensores} />
      )}

      {/* Solicitudes abiertas */}
      {cuenta.solicitudes.length > 0 && (
        <section aria-labelledby="solicitudes-abiertas-heading">
          <h2 id="solicitudes-abiertas-heading" className="text-lg font-semibold text-white mb-3">
            Solicitudes en curso
          </h2>
          <div className="space-y-2">
            {cuenta.solicitudes.map((s) => (
              <div
                key={s.id}
                className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="text-slate-300 text-sm truncate">{s.descripcion}</p>
                <span
                  className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                    s.estado === "EN_PROCESO"
                      ? "bg-blue-900/40 text-blue-400"
                      : "bg-amber-900/40 text-amber-400"
                  }`}
                >
                  {s.estado === "EN_PROCESO" ? "En proceso" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/portal/solicitudes"
            className="text-xs text-orange-400 hover:text-orange-300 mt-2 inline-block transition-colors"
          >
            Ver historial completo →
          </Link>
        </section>
      )}

      {/* Sensores */}
      <section aria-labelledby="sensores-heading">
        <h2 id="sensores-heading" className="text-lg font-semibold text-white mb-4">
          Dispositivos instalados
        </h2>

        {cuenta.sensores.length === 0 ? (
          <p className="text-slate-400">No hay dispositivos registrados.</p>
        ) : (
          <ul className="space-y-3" role="list" aria-label="Lista de sensores">
            {cuenta.sensores.map((sensor) => (
              <SensorItem key={sensor.id} sensor={sensor} />
            ))}
          </ul>
        )}
      </section>

      {/* Solicitar mantenimiento */}
      <section aria-labelledby="mant-heading">
        <h2 id="mant-heading" className="text-lg font-semibold text-white mb-4">
          ¿Algo no funciona bien?
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/portal/solicitud?cuenta=${cuenta.id}`}
            className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium min-h-[48px] border border-slate-600 transition-colors"
          >
            Solicitar asistencia técnica
          </Link>
          <Link
            href="/portal/solicitudes"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white px-6 py-3 rounded-lg font-medium min-h-[48px] border border-slate-700 hover:border-slate-500 transition-colors text-sm"
          >
            Ver mis solicitudes
          </Link>
        </div>
      </section>
    </div>
  );
}

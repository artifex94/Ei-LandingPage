import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BatteryWarning, BatteryLow, Wrench } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { SensorItem } from "@/components/portal/SensorItem";
import { PortalSection } from "@/components/portal/PortalSection";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { ReordenarContactos } from "@/components/portal/ReordenarContactos";
import { Badge } from "@/components/ui/Badge";
import { UUID_RE } from "@/lib/constants/validation";
import { softguardWebApiConfigured, fetchContactosCuenta } from "@/lib/softguard/api";
import { CAMPO_ORDEN_AVISOS } from "@/lib/solicitudes-cambio";

/** Contactos de aviso de la cuenta (de la central). `null` = aún no disponible (sin iid o sin respuesta). */
async function getContactosAviso(iid: number | null) {
  if (!iid || !softguardWebApiConfigured()) return null;
  try {
    return await fetchContactosCuenta(iid);
  } catch {
    return null;
  }
}

const getCuenta = cache(async (id: string, userId: string) =>
  prisma.cuenta.findFirst({
    where: { id, perfil_id: userId },
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
  })
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Mi cuenta" };
  const { userId } = await requireSesion();
  const cuenta = await getCuenta(id, userId);
  return { title: cuenta?.descripcion ?? "Mi cuenta" };
}

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
    // Server Component: Date.now() corre una vez en el render del servidor
    // (no hay re-render en cliente) → resultado estable.
    // eslint-disable-next-line react-hooks/purity
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
          <span className="inline-flex items-center gap-1">
            <BatteryWarning aria-hidden="true" className="w-3.5 h-3.5 text-red-400" strokeWidth={1.8} />
            {bateriaCritica} batería{bateriaCritica > 1 ? "s" : ""} crítica{bateriaCritica > 1 ? "s" : ""}
          </span>
        )}
        {bateriaAdvertencia > 0 && (
          <span className="inline-flex items-center gap-1">
            <BatteryLow aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.8} />
            {bateriaAdvertencia} batería{bateriaAdvertencia > 1 ? "s" : ""} baja{bateriaAdvertencia > 1 ? "s" : ""}
          </span>
        )}
        {enMantenimiento > 0 && (
          <span className="inline-flex items-center gap-1">
            <Wrench aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={1.8} />
            {enMantenimiento} dispositivo{enMantenimiento > 1 ? "s" : ""} con alerta de mantenimiento
          </span>
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
  if (!UUID_RE.test(id)) notFound();
  const { userId } = await requireSesion();

  const cuenta = await getCuenta(id, userId);

  if (!cuenta) notFound();

  const pagoPendiente = cuenta.pagos.find(
    (p) => p.estado === "PENDIENTE" || p.estado === "VENCIDO"
  );

  const contactos = await getContactosAviso(cuenta.iid_softguard);
  const tienePendienteOrden =
    (await prisma.solicitudCambioInfo.findFirst({
      where: { perfil_id: userId, cuenta_id: cuenta.id, campo: CAMPO_ORDEN_AVISOS, estado: "PENDIENTE" },
      select: { id: true },
    })) !== null;

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/portal/dashboard" className="hover:text-white min-h-[44px] inline-flex items-center transition-colors">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium truncate max-w-[200px]">
            {cuenta.descripcion}
          </li>
        </ol>
      </nav>

      <PortalPageHeader
        eyebrow="Mi instalación"
        title={cuenta.descripcion}
        titleId="cuenta-heading"
        description={`Referencia ${cuenta.softguard_ref ?? "—"}`}
        action={pagoPendiente ? (
            <Link
              href="/portal/pagos"
              className="portal-action border-red-700/70 bg-red-600 text-white hover:border-red-600 hover:bg-red-500"
            >
              Pagar ${Number(pagoPendiente.importe).toLocaleString("es-AR")}
            </Link>
        ) : undefined}
      />

      {/* Panel de estado del sistema */}
      {cuenta.sensores.length > 0 && (
        <PanelEstado sensores={cuenta.sensores} />
      )}

      {/* Solicitudes abiertas */}
      {cuenta.solicitudes.length > 0 && (
        <PortalSection title="Solicitudes en curso" titleId="solicitudes-abiertas-heading" ledClass="bg-amber-400">
          <div className="space-y-2">
            {cuenta.solicitudes.map((s) => (
              <div
                key={s.id}
                className="portal-row flex items-center justify-between gap-3 px-4 py-3"
              >
                <p className="text-slate-300 text-sm truncate">{s.descripcion}</p>
                <Badge variant={s.estado === "EN_PROCESO" ? "info" : "warning"} className="shrink-0">
                  {s.estado === "EN_PROCESO" ? "En proceso" : "Pendiente"}
                </Badge>
              </div>
            ))}
          </div>
          <Link
            href="/portal/solicitudes"
            className="text-xs text-orange-400 hover:text-orange-300 mt-2 inline-block transition-colors"
          >
            Ver historial completo →
          </Link>
        </PortalSection>
      )}

      {/* Sensores */}
      <PortalSection title="Dispositivos instalados" titleId="sensores-heading">
        {cuenta.sensores.length === 0 ? (
          <p className="text-slate-400">No hay dispositivos registrados.</p>
        ) : (
          <ul className="space-y-2" role="list" aria-label="Lista de sensores">
            {cuenta.sensores.map((sensor) => (
              <SensorItem key={sensor.id} sensor={sensor} />
            ))}
          </ul>
        )}
      </PortalSection>

      {/* Contactos de aviso (prioridad) */}
      <PortalSection title="Contactos de aviso" titleId="contactos-aviso-heading">
        {contactos === null ? (
          <p className="text-slate-400 text-sm">
            Estamos sincronizando los contactos de esta cuenta con la central. Volvé a entrar en un rato.
          </p>
        ) : contactos.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No hay contactos de aviso cargados en la central para esta cuenta.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-3">
              Ante un evento te avisamos a estas personas en este orden de prioridad. Si querés cambiarlo,
              reordenalas (arrastrá o usá las flechas ↑/↓) y pedinos el cambio: lo aplicamos en la central.
            </p>
            <ReordenarContactos
              cuentaId={cuenta.id}
              contactos={contactos.map((c) => ({ nombre: c.nombre, telefono: c.telefono, rol: c.rol }))}
              tienePendiente={tienePendienteOrden}
            />
          </>
        )}
      </PortalSection>

      {/* Solicitar mantenimiento */}
      <PortalSection title="¿Algo no funciona bien?" titleId="mant-heading">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/portal/solicitud?cuenta=${cuenta.id}`}
            className="portal-action portal-action-primary"
          >
            Solicitar asistencia técnica
          </Link>
          <Link
            href="/portal/solicitudes"
            className="portal-action"
          >
            Ver mis solicitudes
          </Link>
        </div>
      </PortalSection>
    </div>
  );
}

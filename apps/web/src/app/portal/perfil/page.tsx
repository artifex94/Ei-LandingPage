import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { SolicitudCambioForm } from "@/components/portal/SolicitudCambioForm";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalSection } from "@/components/portal/PortalSection";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";

export const metadata: Metadata = { title: "Mi perfil" };

const CATEGORIA_LABEL: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma y monitoreo",
  DOMOTICA: "Domótica",
  CAMARA_CCTV: "Cámaras CCTV",
  ANTENA_STARLINK: "Antena StarLink",
  OTRO: "Otro",
};

const TIPO_TITULAR_LABEL: Record<string, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
  OFICINAS: "Oficinas",
  VEHICULO: "Vehículo",
};

const ESTADO_CAMBIO_VARIANT: Record<string, BadgeVariant> = {
  PENDIENTE: "warning",
  APROBADO:  "success",
  RECHAZADO: "danger",
};

const CAMPO_LABEL: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
  orden_avisos: "Orden de avisos",
};

export default async function PerfilPage() {
  const { userId } = await requireSesion();

  const perfil = await prisma.perfil.findUnique({
    where: { id: userId },
    include: {
      solicitudes_cambio: {
        orderBy: { created_at: "desc" },
        take: 30,
      },
      cuentas: {
        where: { estado: { not: "BAJA_DEFINITIVA" } },
        select: {
          id: true,
          descripcion: true,
          softguard_ref: true,
          calle: true,
          localidad: true,
          provincia: true,
          codigo_postal: true,
          categoria: true,
          estado: true,
        },
        orderBy: { descripcion: "asc" },
      },
    },
  });

  if (!perfil) redirect("/login");

  type SolicitudRow = (typeof perfil.solicitudes_cambio)[number];

  const solicitudColumns: Column<SolicitudRow>[] = [
    {
      id: "campo",
      header: "Campo",
      className: "px-5",
      cell: (s) => <span className="text-slate-300">{CAMPO_LABEL[s.campo] ?? s.campo}</span>,
    },
    {
      id: "valor",
      header: "Valor propuesto",
      className: "px-5 hidden sm:table-cell",
      cell: (s) => <span className="block text-slate-300 truncate max-w-[200px]">{s.valor_nuevo}</span>,
    },
    {
      id: "estado",
      header: "Estado",
      className: "px-5",
      cell: (s) => (
        <div>
          <Badge variant={ESTADO_CAMBIO_VARIANT[s.estado] ?? "neutral"}>{s.estado}</Badge>
          {s.notas_admin && <p className="text-xs text-slate-400 mt-1">{s.notas_admin}</p>}
        </div>
      ),
    },
    {
      id: "fecha",
      header: "Fecha",
      className: "px-5 hidden md:table-cell",
      cell: (s) => (
        <span className="text-slate-400 whitespace-nowrap">
          {new Date(s.created_at).toLocaleDateString("es-AR")}
        </span>
      ),
    },
  ];

  // Determinar qué campos tienen solicitud pendiente
  const pendientesPorCampo = new Set(
    perfil.solicitudes_cambio
      .filter((s) => s.estado === "PENDIENTE")
      .map((s) => s.campo)
  );

  const camposEditables: { campo: "nombre" | "telefono" | "email"; label: string; valor: string | null }[] = [
    { campo: "nombre", label: "Nombre completo", valor: perfil.nombre },
    { campo: "telefono", label: "Teléfono", valor: perfil.telefono ?? null },
    { campo: "email", label: "Email", valor: perfil.email ?? null },
  ];

  return (
    <div className="space-y-7">
      <PortalPageHeader
        eyebrow="Mi Central"
        title="Mi perfil"
        description="Tus datos de contacto e instalaciones."
      />

      {/* ── Datos de contacto ─────────────────────────────────────────────── */}
      <PortalSection title="Datos de contacto" titleId="contacto-heading">
        <div className="portal-panel divide-y divide-industrial-700/60">
          {/* DNI — solo lectura */}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-0.5">DNI</p>
              <p className="text-white font-medium">{perfil.dni ?? "—"}</p>
            </div>
            <span className="text-xs text-slate-500 italic">No modificable</span>
          </div>

          {/* Tipo de titular — solo lectura */}
          {perfil.tipo_titular && (
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-xs font-medium text-slate-400 mb-0.5">Tipo de titular</p>
                <p className="text-white font-medium">
                  {TIPO_TITULAR_LABEL[perfil.tipo_titular]}
                </p>
              </div>
              <span className="text-xs text-slate-500 italic">No modificable</span>
            </div>
          )}

          {/* Campos editables */}
          {camposEditables.map(({ campo, label, valor }) => (
            <div key={campo} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">{label}</p>
                  <p className="text-white font-medium truncate">
                    {valor ?? <span className="text-slate-500 italic">Sin registrar</span>}
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <SolicitudCambioForm
                    campo={campo}
                    campoLabel={label}
                    valorActual={valor}
                    tienePendiente={pendientesPorCampo.has(campo)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Los cambios solicitados son revisados por el equipo de Escobar Instalaciones antes de aplicarse.
        </p>
      </PortalSection>

      {/* ── Mis instalaciones ─────────────────────────────────────────────── */}
      {perfil.cuentas.length > 0 && (
        <PortalSection title="Mis instalaciones" titleId="instalaciones-heading">
          <div className="space-y-2">
            {perfil.cuentas.map((cuenta) => {
              const tieneDir = cuenta.calle || cuenta.localidad || cuenta.provincia;
              return (
                <div
                  key={cuenta.id}
                  className="portal-row px-4 py-3"
                >
                  <div className="mb-3">
                    <p className="font-semibold text-white">{cuenta.descripcion}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {CATEGORIA_LABEL[cuenta.categoria]} · Ref: {cuenta.softguard_ref}
                    </p>
                  </div>

                  {tieneDir ? (
                    <address className="not-italic text-sm text-slate-300">
                      {[cuenta.calle, cuenta.localidad, cuenta.provincia, cuenta.codigo_postal]
                        .filter(Boolean)
                        .join(", ")}
                    </address>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Dirección no registrada</p>
                  )}

                  <p className="text-xs text-slate-500 mt-3">
                    Para cambios de dirección, contactá a Escobar Instalaciones.
                  </p>
                </div>
              );
            })}
          </div>
        </PortalSection>
      )}

      {/* ── Historial de solicitudes ───────────────────────────────────────── */}
      {perfil.solicitudes_cambio.length > 0 && (
        <PortalSection title="Historial de solicitudes" titleId="historial-heading">
          <DataTable
            columns={solicitudColumns}
            rows={perfil.solicitudes_cambio}
            keyExtractor={(s) => s.id}
            caption="Historial de solicitudes de cambio"
          />
        </PortalSection>
      )}
    </div>
  );
}

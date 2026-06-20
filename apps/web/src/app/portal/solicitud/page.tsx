import type { Metadata } from "next";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { SolicitudForm } from "./SolicitudForm";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const metadata: Metadata = { title: "Nueva solicitud" };

export default async function SolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>;
}) {
  const { cuenta: cuentaPreId } = await searchParams;
  const { userId } = await requireSesion();

  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: userId, estado: { in: ["ACTIVA", "EN_MANTENIMIENTO"] } },
    select: { id: true, descripcion: true },
    orderBy: { descripcion: "asc" },
  });

  if (cuentas.length === 0) {
    return (
      <section>
        <h1 className="text-2xl font-display font-bold text-white mb-4">
          Solicitar asistencia
        </h1>
        <p className="text-slate-400">No tenés servicios activos para solicitar asistencia.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="solicitud-heading" className="space-y-7">
      <PortalPageHeader
        eyebrow="Asistencia"
        title="Contanos qué pasó"
        titleId="solicitud-heading"
        description="Elegí la instalación y describí el problema."
      />

      <div className="portal-panel max-w-xl p-5 sm:p-6">
        <SolicitudForm cuentas={cuentas} cuentaPreId={cuentaPreId} />
      </div>
    </section>
  );
}

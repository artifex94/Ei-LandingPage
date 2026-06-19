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
        title="Solicitar asistencia técnica"
        titleId="solicitud-heading"
        description="Describí el problema y nos comunicamos a la brevedad."
      />

      <div className="rounded-lg border border-industrial-700 bg-industrial-800/80 shadow-[0_8px_24px_rgba(0,0,0,0.4)] p-6 max-w-xl">
        <SolicitudForm cuentas={cuentas} cuentaPreId={cuentaPreId} />
      </div>
    </section>
  );
}

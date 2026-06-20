import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TurnoCheckinClient } from "./TurnoCheckinClient";

export const metadata = { title: "Turno actual" };

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function endOfToday() {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d;
}

export default async function TurnoActualPage() {
  const { userId } = await requireSesion();

  const hoy = startOfToday();
  const finHoy = endOfToday();

  const [empleado, turnoHoy] = await Promise.all([
    prisma.empleado.findUnique({
      where: { perfil_id: userId },
      select: { id: true, puede_monitorear: true },
    }),
    prisma.turno.findFirst({
      where: {
        empleado: { perfil_id: userId },
        fecha:  { gte: hoy, lte: finHoy },
        estado: { in: ["PROGRAMADO", "EN_CURSO"] },
      },
      orderBy: { franja: "asc" },
    }),
  ]);
  if (!empleado) redirect("/portal/dashboard");

  const FRANJA_LABEL: Record<string, string> = {
    MANANA: "Mañana (06–14 hs)",
    TARDE:  "Tarde (14–22 hs)",
    NOCHE:  "Noche (22–06 hs)",
  };

  return (
    <div className="space-y-7">
      <PortalPageHeader
        eyebrow="Mi Central"
        title="Turno actual"
        description={new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
      />

      {!turnoHoy ? (
        <EmptyState
          icon={Clock}
          title="No tenés un turno asignado para hoy."
          description="Si creés que hay un error, consultá con Ramiro."
        />
      ) : (
        <TurnoCheckinClient
          turnoId={turnoHoy.id}
          franja={FRANJA_LABEL[turnoHoy.franja] ?? turnoHoy.franja}
          estado={turnoHoy.estado}
          checkinAt={turnoHoy.checkin_at?.toISOString() ?? null}
          checkoutAt={turnoHoy.checkout_at?.toISOString() ?? null}
        />
      )}
    </div>
  );
}

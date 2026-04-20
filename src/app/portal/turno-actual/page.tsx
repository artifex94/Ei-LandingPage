import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { TurnoCheckinClient } from "./TurnoCheckinClient";

export const metadata = { title: "Turno actual — Portal EI" };

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function endOfToday() {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d;
}

export default async function TurnoActualPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const empleado = await prisma.empleado.findUnique({
    where: { perfil_id: user.id },
    select: { id: true, puede_monitorear: true },
  });
  if (!empleado) redirect("/portal/dashboard");

  const hoy = startOfToday();
  const finHoy = endOfToday();

  const turnoHoy = await prisma.turno.findFirst({
    where: {
      empleado_id: empleado.id,
      fecha: { gte: hoy, lte: finHoy },
      estado: { in: ["PROGRAMADO", "EN_CURSO"] },
    },
    orderBy: { franja: "asc" },
  });

  const FRANJA_LABEL: Record<string, string> = {
    MANANA: "Mañana (06–14 hs)",
    TARDE:  "Tarde (14–22 hs)",
    NOCHE:  "Noche (22–06 hs)",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Turno actual</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {!turnoHoy ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-slate-400">No tenés un turno asignado para hoy.</p>
          <p className="text-xs text-slate-600 mt-1">
            Si creés que hay un error, consultá con Ramiro.
          </p>
        </div>
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

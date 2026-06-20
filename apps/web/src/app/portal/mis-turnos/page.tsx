import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Mis turnos" };

const FRANJA_LABEL: Record<string, string> = {
  MANANA: "Mañana (06–14)",
  TARDE:  "Tarde (14–22)",
  NOCHE:  "Noche (22–06)",
};

const ESTADO_VARIANT: Record<string, BadgeVariant> = {
  PROGRAMADO:  "neutral",
  EN_CURSO:    "info",
  COMPLETADO:  "success",
  AUSENTE:     "danger",
  REEMPLAZADO: "warning",
};

const ESTADO_LABEL: Record<string, string> = {
  PROGRAMADO:  "Programado",
  EN_CURSO:    "En curso",
  COMPLETADO:  "Completado",
  AUSENTE:     "Ausente",
  REEMPLAZADO: "Reemplazado",
};

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

export default async function MisTurnosPage() {
  const { userId } = await requireSesion();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en30 = addDays(hoy, 30);

  const [empleado, turnos] = await Promise.all([
    prisma.empleado.findUnique({ where: { perfil_id: userId }, select: { id: true } }),
    prisma.turno.findMany({
      where: { empleado: { perfil_id: userId }, fecha: { gte: hoy, lte: en30 } },
      orderBy: [{ fecha: "asc" }, { franja: "asc" }],
    }),
  ]);
  if (!empleado) redirect("/portal/dashboard");

  return (
    <div className="space-y-7">
      <PortalPageHeader eyebrow="Mi Central" title="Mis turnos" description="Próximos 30 días." />

      {turnos.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No tenés turnos asignados en los próximos 30 días."
          description="Cuando el equipo asigne un turno aparecerá acá."
        />
      ) : (
        <ul role="list" className="space-y-2">
          {turnos.map((t) => {
            const fechaLabel = new Date(`${String(t.fecha).slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", {
              weekday: "long", day: "numeric", month: "long",
            });
            const estadoLabel = ESTADO_LABEL[t.estado] ?? t.estado;
            return (
              <li
                key={t.id}
                role="listitem"
                aria-label={`${fechaLabel}, ${FRANJA_LABEL[t.franja] ?? t.franja}, estado: ${estadoLabel}`}
                className="portal-row flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white capitalize">{fechaLabel}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{FRANJA_LABEL[t.franja] ?? t.franja}</p>
                  {t.notas && (
                    <p className="text-xs text-slate-400 mt-1">{t.notas}</p>
                  )}
                </div>
                <Badge variant={ESTADO_VARIANT[t.estado] ?? "neutral"} className="flex-shrink-0">
                  {estadoLabel}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

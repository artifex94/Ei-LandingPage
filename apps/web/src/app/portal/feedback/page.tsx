import type { Metadata } from "next";
import { MessageSquareWarning } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { fechaAR } from "@/lib/fecha-ar";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalSection } from "@/components/portal/PortalSection";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = { title: "Sugerencias" };

const TIPO_LABEL: Record<string, string> = {
  BUG: "Problema",
  MEJORA: "Mejora",
};

const ESTADO_LABEL: Record<string, string> = {
  NUEVO: "Recibido",
  EN_REVISION: "En revisión",
  RESUELTO: "Resuelto",
  DESCARTADO: "Descartado",
};

const ESTADO_VARIANT: Record<string, BadgeVariant> = {
  NUEVO: "info",
  EN_REVISION: "warning",
  RESUELTO: "success",
  DESCARTADO: "neutral",
};

export default async function FeedbackPage() {
  const { userId } = await requireSesion();

  const tickets = await prisma.ticketFeedback.findMany({
    where: { perfil_id: userId },
    orderBy: { creado_en: "desc" },
    take: 50,
  });

  return (
    <section aria-labelledby="feedback-heading" className="space-y-7">
      <PortalPageHeader
        eyebrow="Mi Central"
        title="Sugerencias"
        titleId="feedback-heading"
        description="Reportanos un problema o contanos qué te gustaría que mejoremos."
      />

      <div className="portal-panel max-w-xl p-5 sm:p-6">
        <FeedbackForm />
      </div>

      <PortalSection
        titleId="feedback-lista"
        title="Tus reportes"
        meta={tickets.length > 0 ? `${tickets.length}` : undefined}
      >
        {tickets.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title="Todavía no enviaste ningún reporte."
            description="Cuando reportes un problema o sugieras una mejora, lo vas a ver acá con su estado."
          />
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-industrial-700 bg-industrial-800/45 hover:bg-industrial-800/75 transition-colors px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-400">
                      {TIPO_LABEL[t.tipo] ?? t.tipo}
                    </p>
                    <p className="text-sm text-white leading-snug mt-0.5">{t.descripcion}</p>
                  </div>
                  <Badge variant={ESTADO_VARIANT[t.estado] ?? "neutral"} className="flex-shrink-0">
                    {ESTADO_LABEL[t.estado] ?? t.estado}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2">{fechaAR(t.creado_en)}</p>

                {(t.estado === "RESUELTO" || t.estado === "DESCARTADO") && t.nota_admin && (
                  <div className="mt-3 rounded-lg border border-industrial-700 bg-industrial-900/60 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Respuesta
                    </p>
                    <p className="text-sm text-slate-300 mt-1">{t.nota_admin}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PortalSection>
    </section>
  );
}

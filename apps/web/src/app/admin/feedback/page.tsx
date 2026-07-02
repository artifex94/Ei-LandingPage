import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Lightbulb, Image as ImageIcon, Video, MessageSquareWarning } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { fechaAR, horaCortaAR } from "@/lib/fecha-ar";
import { ordenarTickets } from "@/lib/feedback-tickets";
import { EmptyState } from "@/components/ui/EmptyState";
import { TicketAccionesForm } from "./TicketAccionesForm";

export const metadata: Metadata = { title: "Feedback" };

const TIPO_CONFIG: Record<string, { label: string; cls: string; icon: typeof Bug }> = {
  BUG: { label: "Bug", cls: "bg-orange-900/40 text-orange-400 border-orange-800/40", icon: Bug },
  MEJORA: { label: "Mejora", cls: "bg-cyan-900/40 text-cyan-400 border-cyan-800/40", icon: Lightbulb },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; cls: string }> = {
  CRITICA: { label: "Crítica", cls: "bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-700/40" },
  ALTA: { label: "Alta", cls: "bg-amber-900/40 text-amber-400 border-amber-800/40" },
  MEDIA: { label: "Media", cls: "bg-slate-700/50 text-amber-300/80 border-slate-600/40" },
  BAJA: { label: "Baja", cls: "bg-slate-700/50 text-slate-400 border-slate-600/40" },
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  NUEVO: { label: "Nuevo", cls: "bg-amber-900/40 text-amber-400 border-amber-800/40" },
  EN_REVISION: { label: "En revisión", cls: "bg-blue-900/40 text-blue-400 border-blue-800/40" },
  RESUELTO: { label: "Resuelto", cls: "bg-green-900/40 text-green-400 border-green-800/40" },
  DESCARTADO: { label: "Descartado", cls: "bg-slate-700/40 text-slate-400 border-slate-600/40" },
};

export default async function FeedbackAdminPage() {
  await requireAdmin();

  // `.catch(() => [])`: pre-migración (SQL manual sin correr todavía) la
  // tabla puede no existir aún — la bandeja no debe romperse por eso.
  const ticketsRaw = await prisma.ticketFeedback
    .findMany({
      include: { perfil: { select: { id: true, nombre: true } } },
      take: 300,
    })
    .catch(() => []);

  const tickets = ordenarTickets(ticketsRaw);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Feedback de clientes</h1>
        <p className="text-slate-400 text-sm mt-1">
          Bugs reportados y mejoras sugeridas desde el portal.
        </p>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No hay reportes todavía."
          description="Los bugs y sugerencias que carguen los clientes desde el portal van a aparecer acá."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const tipo = TIPO_CONFIG[t.tipo] ?? { label: t.tipo, cls: "bg-slate-700 text-slate-300 border-slate-600", icon: MessageSquareWarning };
            const prioridad = PRIORIDAD_CONFIG[t.prioridad] ?? { label: t.prioridad, cls: "text-slate-400" };
            const estado = ESTADO_CONFIG[t.estado] ?? { label: t.estado, cls: "bg-slate-700 text-slate-300 border-slate-600" };
            const TipoIcon = tipo.icon;
            const esVideo = t.adjunto_mime?.startsWith("video/");

            return (
              <div key={t.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${tipo.cls}`}>
                      <TipoIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      {tipo.label}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${prioridad.cls}`}>
                      Prioridad: {prioridad.label}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${estado.cls}`}>
                      {estado.label}
                    </span>
                  </div>
                </div>

                {/* Remitente + fecha */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                  <Link
                    href={`/admin/clientes/${t.perfil.id}`}
                    className="font-semibold text-white hover:text-orange-400 transition-colors"
                  >
                    {t.perfil.nombre}
                  </Link>
                  <span>{fechaAR(t.creado_en)} · {horaCortaAR(t.creado_en)}</span>
                </div>

                {/* Descripción */}
                <p className="text-slate-300 text-sm mb-3 leading-relaxed line-clamp-3">{t.descripcion}</p>

                {/* Adjunto */}
                {t.adjunto_url && (
                  <a
                    href={t.adjunto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors mb-3"
                  >
                    {esVideo ? <Video className="w-3.5 h-3.5" aria-hidden="true" /> : <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                    Ver adjunto ({esVideo ? "video" : "imagen"})
                  </a>
                )}

                {t.resuelto_en && (
                  <p className="text-xs text-green-500 mb-1">
                    Cerrado el {fechaAR(t.resuelto_en)}
                  </p>
                )}

                <TicketAccionesForm id={t.id} estado={t.estado} notaActual={t.nota_admin} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

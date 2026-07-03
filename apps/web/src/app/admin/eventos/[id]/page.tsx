import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { EventoEstadoBadge, ESTADO_LABEL } from "@/components/admin/eventos/EventoEstadoBadge";
import { actualizarEstadoEvento } from "@/lib/actions/eventos";
import { UUID_RE } from "@/lib/constants/validation";

export const metadata: Metadata = { title: "Detalle de evento" };

const ESTADOS = [
  "NUEVO",
  "EN_PROCESO",
  "EN_ESPERA",
  "EN_PROCESO_DESDE_ESPERA",
  "EN_PROCESO_MULTIPLE",
  "PROCESADO",
  "PROCESADO_NO_ALERTA",
  "PROCESADO_MODO_PRUEBA",
  "PROCESADO_MODO_OFF",
] as const;

export default async function EventoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [evento, auditLogs] = await Promise.all([
    prisma.eventoAlarma.findUnique({
      where: { id },
      include: {
        cuenta: {
          select: {
            descripcion: true,
            softguard_ref: true,
            perfil: { select: { nombre: true, telefono: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entidad: "evento_alarma", entidad_id: id },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
  ]);

  if (!evento) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const nuevoEstado = formData.get("estado") as string;
    const resolucion = (formData.get("resolucion") as string) || undefined;
    // Errores se loguean en actualizarEstadoEvento; siempre redirigir
    // para que el usuario vea el estado actual (sin silencio).
    await actualizarEstadoEvento(id, nuevoEstado, resolucion);
    redirect(`/admin/eventos/${id}`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/eventos"
          className="text-slate-400 hover:text-white text-sm mt-1 transition-colors min-h-[44px] inline-flex items-center"
        >
          ← Volver
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Evento de alarma</h1>
            <EventoEstadoBadge estado={evento.estado} size="md" />
          </div>
          <p className="text-slate-400 text-sm mt-1 truncate">{evento.descripcion}</p>
          <p className="text-slate-500 text-xs font-mono mt-0.5">{evento.codigo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Datos del evento */}
        <Card titulo="Datos del evento">
          <dl className="space-y-2 text-sm">
            <Row label="Fecha">
              {new Date(evento.fecha_evento).toLocaleString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Argentina/Buenos_Aires",
              })}
            </Row>
            <Row label="Código">
              <span className="font-mono">{evento.codigo}</span>
            </Row>
            {evento.zona && <Row label="Zona">{evento.zona}</Row>}
            {evento.prioridad != null && (
              <Row label="Prioridad">{evento.prioridad}</Row>
            )}
            {evento.operador_softguard && (
              <Row label="Operador">{evento.operador_softguard}</Row>
            )}
            <Row label="Notificado">
              {evento.notificado_cliente ? (
                <span className="text-emerald-400">Sí</span>
              ) : (
                <span className="text-slate-500">No</span>
              )}
            </Row>
            {evento.resolucion && <Row label="Resolución">{evento.resolucion}</Row>}
          </dl>
        </Card>

        {/* Cuenta asociada */}
        <Card titulo="Cuenta asociada">
          {evento.cuenta ? (
            <dl className="space-y-2 text-sm">
              <Row label="Titular">{evento.cuenta.perfil.nombre}</Row>
              {evento.cuenta.perfil.telefono && (
                <Row label="Teléfono">
                  <a
                    href={`https://wa.me/549${evento.cuenta.perfil.telefono.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {evento.cuenta.perfil.telefono}
                  </a>
                </Row>
              )}
              <Row label="Descripción">{evento.cuenta.descripcion}</Row>
              <Row label="Ref. SoftGuard">
                <span className="font-mono text-xs">{evento.cuenta.softguard_ref}</span>
              </Row>
            </dl>
          ) : (
            <p className="text-slate-500 text-sm">
              Ref. SoftGuard:{" "}
              <span className="font-mono text-slate-400">{evento.softguard_ref}</span>
            </p>
          )}
        </Card>
      </div>

      {/* Formulario de actualización de estado */}
      <Card titulo="Actualizar estado">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="estado-select"
              className="block text-xs text-slate-400 mb-1.5"
            >
              Nuevo estado
            </label>
            <select
              id="estado-select"
              name="estado"
              defaultValue={evento.estado}
              required
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABEL[e] ?? e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="resolucion-input"
              className="block text-xs text-slate-400 mb-1.5"
            >
              Resolución / notas (opcional)
            </label>
            <textarea
              id="resolucion-input"
              name="resolucion"
              defaultValue={evento.resolucion ?? ""}
              rows={3}
              placeholder="Observaciones sobre la resolución del evento..."
              className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm resize-none focus:outline-2 focus:outline-orange-500"
            />
          </div>
          <button
            type="submit"
            className="bg-tactical-500 hover:bg-orange-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors"
          >
            Guardar cambios
          </button>
        </form>
      </Card>

      {/* Historial de auditoría */}
      {auditLogs.length > 0 && (
        <Card titulo={`Historial de auditoría (${auditLogs.length})`}>
          <ol className="space-y-3" aria-label="Historial de cambios del evento">
            {auditLogs.map((log) => {
              let stateTransition: { prior_state?: string | null; new_state?: string } | null = null;
              try {
                if (log.state_transition) {
                  stateTransition = JSON.parse(log.state_transition);
                }
              } catch {
                // ignore malformed JSON
              }

              return (
                <li key={log.id} className="text-sm border-l-2 border-slate-700 pl-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-xs">{log.accion}</p>
                      <p className="text-slate-400 text-xs">{log.admin_nombre ?? "—"}</p>
                      {stateTransition && (
                        <p className="text-slate-500 text-xs mt-0.5">
                          {stateTransition.prior_state
                            ? `${ESTADO_LABEL[stateTransition.prior_state] ?? stateTransition.prior_state} → `
                            : ""}
                          <span className="text-slate-300">
                            {stateTransition.new_state
                              ? (ESTADO_LABEL[stateTransition.new_state] ?? stateTransition.new_state)
                              : ""}
                          </span>
                        </p>
                      )}
                    </div>
                    <time
                      dateTime={log.created_at.toISOString()}
                      className="text-slate-500 text-xs whitespace-nowrap shrink-0"
                    >
                      {new Date(log.created_at).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="text-slate-500 shrink-0 w-24">{label}</dt>
      <dd className="text-slate-300 min-w-0">{children}</dd>
    </div>
  );
}

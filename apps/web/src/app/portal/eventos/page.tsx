import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { getEventosHeatmap } from "@/lib/actions/eventos";
import { EventosHeatmap } from "@/components/portal/EventosHeatmap";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalSection } from "@/components/portal/PortalSection";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";

export const metadata: Metadata = { title: "Mis eventos" };

const PAGE_SIZE = 25;

const ESTADO_LABEL: Record<string, string> = {
  NUEVO:                   "Nuevo",
  EN_PROCESO:              "En atención",
  EN_ESPERA:               "En espera",
  EN_PROCESO_DESDE_ESPERA: "Retomado",
  EN_PROCESO_MULTIPLE:     "Múltiple",
  PROCESADO:               "Atendido",
  PROCESADO_NO_ALERTA:     "Sin novedad",
  PROCESADO_MODO_PRUEBA:   "Prueba",
  PROCESADO_MODO_OFF:      "Armado off",
};

const ESTADO_VARIANT: Record<string, BadgeVariant> = {
  NUEVO:                   "danger",
  EN_PROCESO:              "info",
  EN_ESPERA:               "warning",
  EN_PROCESO_DESDE_ESPERA: "info",
  EN_PROCESO_MULTIPLE:     "info",
  PROCESADO:               "success",
  PROCESADO_NO_ALERTA:     "neutral",
  PROCESADO_MODO_PRUEBA:   "neutral",
  PROCESADO_MODO_OFF:      "neutral",
};

export default async function EventosPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; cuenta?: string; page?: string }>;
}) {
  const { userId } = await requireSesion();

  const sp = await searchParams;
  const anioActual = new Date().getFullYear();
  const anio = Number(sp.anio) || anioActual;
  const page = Math.max(1, Number(sp.page) || 1);

  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: userId, estado: { not: "BAJA_DEFINITIVA" } },
    select: { id: true, descripcion: true },
    orderBy: { descripcion: "asc" },
  });

  // Filtro por cuenta (solo válido si pertenece al usuario)
  const cuentaFiltro = cuentas.find((c) => c.id === sp.cuenta)?.id;
  const cuentasVisibles = cuentaFiltro
    ? cuentas.filter((c) => c.id === cuentaFiltro)
    : cuentas;

  const whereEventos = {
    cuenta: {
      perfil_id: userId,
      estado: { not: "BAJA_DEFINITIVA" as const },
      ...(cuentaFiltro ? { id: cuentaFiltro } : {}),
    },
  };

  const [eventos, totalEventos, primerEvento, heatmaps] = await Promise.all([
    prisma.eventoAlarma.findMany({
      where: whereEventos,
      include: { cuenta: { select: { descripcion: true } } },
      orderBy: { fecha_evento: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.eventoAlarma.count({ where: whereEventos }),
    prisma.eventoAlarma.aggregate({
      where: whereEventos,
      _min: { fecha_evento: true },
    }),
    Promise.all(
      cuentasVisibles.map((c) => getEventosHeatmap(c.id, anio).catch(() => []))
    ),
  ]);

  const pageCount = Math.ceil(totalEventos / PAGE_SIZE);

  const primerAnio = primerEvento._min.fecha_evento
    ? new Date(primerEvento._min.fecha_evento).getFullYear()
    : anioActual;
  const aniosDisponibles = Array.from(
    { length: anioActual - primerAnio + 1 },
    (_, i) => anioActual - i
  );

  function makeHref(p: number) {
    const params = new URLSearchParams();
    if (anio !== anioActual) params.set("anio", String(anio));
    if (cuentaFiltro) params.set("cuenta", cuentaFiltro);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/portal/eventos${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <PortalPageHeader
        title="Mis eventos"
        description="Actividad de tu sistema de alarma, día por día."
        action={
          <form method="GET" className="flex items-center gap-2">
            {cuentas.length > 1 && (
              <div className="w-44">
                <label htmlFor="cuenta-select" className="sr-only">Filtrar por cuenta</label>
                <Select id="cuenta-select" name="cuenta" defaultValue={cuentaFiltro ?? ""}>
                  <option value="">Todas las cuentas</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </Select>
              </div>
            )}
            {aniosDisponibles.length > 1 && (
              <div className="w-28">
                <label htmlFor="anio-select" className="sr-only">Seleccionar año</label>
                <Select id="anio-select" name="anio" defaultValue={anio}>
                  {aniosDisponibles.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </div>
            )}
            {(cuentas.length > 1 || aniosDisponibles.length > 1) && (
              <button
                type="submit"
                className="bg-industrial-700 hover:bg-industrial-600 border border-industrial-600 border-b-[3px] border-b-industrial-950 active:border-b active:translate-y-[2px] text-slate-300 hover:text-slate-200 px-5 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest min-h-[48px] transition-all duration-150 ease-mech-press"
              >
                Ver
              </button>
            )}
          </form>
        }
      />

      {/* ── Heatmap anual por cuenta ── */}
      {cuentasVisibles.map((cuenta, i) => (
        <PortalSection
          key={cuenta.id}
          titleId={`heatmap-${cuenta.id}`}
          title={
            cuentasVisibles.length > 1 || cuentaFiltro
              ? cuenta.descripcion
              : "Actividad del sistema"
          }
          meta={anio}
        >
          <EventosHeatmap eventos={heatmaps[i]} anio={anio} />
        </PortalSection>
      ))}

      {/* ── Lista de eventos ── */}
      <PortalSection
        titleId="eventos-lista"
        title="Historial"
        meta={totalEventos > 0 ? `${totalEventos.toLocaleString("es-AR")} eventos` : undefined}
      >
        {eventos.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No hay eventos registrados todavía."
            description="Los eventos de alarma aparecen aquí una vez que el sistema esté sincronizado."
          />
        ) : (
          <div className="space-y-2">
            {eventos.map((ev) => {
              const esAlerta =
                ev.estado === "NUEVO" || ev.estado === "EN_PROCESO" || ev.estado === "EN_ESPERA";
              return (
                <div
                  key={ev.id}
                  className={`rounded-md border bg-industrial-800/60 hover:bg-industrial-800 transition-colors px-4 py-3 ${
                    esAlerta ? "border-red-500/40" : "border-industrial-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug">
                        {ev.descripcion}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[ev.cuenta?.descripcion, ev.zona ? `Zona ${ev.zona}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Badge variant={ESTADO_VARIANT[ev.estado] ?? "neutral"} className="flex-shrink-0">
                      {ESTADO_LABEL[ev.estado] ?? ev.estado}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-mono tabular-nums mt-2">
                    {new Date(ev.fecha_evento).toLocaleString("es-AR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} pageCount={pageCount} makeHref={makeHref} className="mt-4" />
      </PortalSection>
    </div>
  );
}

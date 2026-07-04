import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import type { EstadoEventoSync, FranjaTurno } from "@/generated/prisma/client";
import { clasificarCodigo, PRIORIDAD, type TipoDia } from "@/lib/eventos-clasificacion";
import { AccionEventoRapida } from "@/components/monitoreo/AccionEventoRapida";
import { calcularMetricasDia, formatDuracion } from "@/lib/metricas-monitoreo";
import { TZ_OFFSET_AR_MS } from "@/lib/fecha-ar";
import { getSesionReal } from "@/lib/auth/session";
import { FRANJA_META } from "@/lib/ui/turno-ui";
import { ShieldCheck, Gauge, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Cola de eventos" };

// Estados accionables: lo que el operador todavía tiene que mirar/cerrar.
const PENDIENTES = [
  "NUEVO",
  "EN_PROCESO",
  "EN_PROCESO_MULTIPLE",
  "EN_PROCESO_DESDE_ESPERA",
  "EN_ESPERA",
] as const;

// Estética por severidad (coherente con la clasificación Contact ID del portal).
const SEVERIDAD: Record<TipoDia, { label: string; borde: string; chip: string }> = {
  medica: { label: "Médica", borde: "border-l-red-500", chip: "bg-red-950/50 text-red-300" },
  violencia: { label: "Pánico", borde: "border-l-fuchsia-500", chip: "bg-fuchsia-950/50 text-fuchsia-300" },
  fuego: { label: "Fuego", borde: "border-l-orange-500", chip: "bg-orange-950/50 text-orange-300" },
  intrusion: { label: "Intrusión", borde: "border-l-amber-500", chip: "bg-amber-950/50 text-amber-300" },
  tecnico: { label: "Técnico", borde: "border-l-sky-500", chip: "bg-sky-950/50 text-sky-300" },
  normal: { label: "Normal", borde: "border-l-slate-600", chip: "bg-slate-700 text-slate-300" },
  vacio: { label: "—", borde: "border-l-slate-700", chip: "bg-slate-800 text-slate-400" },
};

function fmtFecha(d: Date): string {
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

// Límites del día "de hoy" en hora de Argentina, expresados como instantes
// UTC (lo que realmente se guarda en `fecha_evento`).
function limitesHoyAR(): { desde: Date; hasta: Date } {
  const ahoraAR = new Date(Date.now() - TZ_OFFSET_AR_MS);
  const inicioAR = Date.UTC(ahoraAR.getUTCFullYear(), ahoraAR.getUTCMonth(), ahoraAR.getUTCDate());
  const desde = new Date(inicioAR + TZ_OFFSET_AR_MS);
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
  return { desde, hasta };
}

// Turno de HOY del empleado logueado, para la barra "Tu turno: …" — sin ruido si
// no tiene turno asignado (ni PROGRAMADO ni EN_CURSO) o si algo falla en la query.
//
// OJO: `Turno.fecha` es una columna @db.Date que el cron de auto-asignación
// (app/api/cron/turnos/route.ts, generarFechasUTC) genera con getUTC*/Date.UTC —
// su "día" es el día calendario UTC, no el día AR. Por eso acá NO se puede
// reusar `limitesHoyAR()` (desplaza +3h para alinear con medianoche AR): eso
// correría la ventana respecto a cómo se generó `fecha` y dejaría el turno de
// hoy sin matchear. Se resuelve "hoy" con las mismas coordenadas UTC que usa
// el cron, en vez de depender del timezone local del proceso del server
// (que `new Date().setHours()` sí arrastra, y que acá no está garantizado).
function limitesHoyUTC(): { desde: Date; hasta: Date } {
  const ahora = new Date();
  const desde = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
  return { desde, hasta };
}

async function turnoDeHoyEmpleado(perfilId: string): Promise<{ franja: FranjaTurno } | null> {
  try {
    const { desde, hasta } = limitesHoyUTC();
    return await prisma.turno.findFirst({
      where: {
        empleado: { perfil_id: perfilId },
        fecha: { gte: desde, lt: hasta },
        estado: { in: ["PROGRAMADO", "EN_CURSO"] },
      },
      select: { franja: true },
      orderBy: { franja: "asc" },
    });
  } catch {
    return null;
  }
}

export default async function MonitoreoColaPage() {
  const { desde: desdeHoy, hasta: hastaHoy } = limitesHoyAR();

  // Las queries de eventos no dependen de la sesión: se disparan antes del
  // await para que corran en paralelo con getSesionReal() (solo turnoHoy
  // necesita el perfil). Un hop menos en el TTFB de la cola.
  const eventosPromise = prisma.eventoAlarma.findMany({
    where: { estado: { in: PENDIENTES as unknown as EstadoEventoSync[] } },
    include: {
      cuenta: {
        select: {
          descripcion: true,
          softguard_ref: true,
          perfil: { select: { nombre: true } },
        },
      },
    },
    orderBy: { fecha_evento: "desc" },
    take: 200,
  });
  const eventosHoyPromise = prisma.eventoAlarma.findMany({
    where: { fecha_evento: { gte: desdeHoy, lt: hastaHoy } },
    select: { estado: true, fecha_evento: true, tomado_en: true, resuelto_en: true },
  });

  const sesion = await getSesionReal();

  const [eventos, eventosHoy, turnoHoy] = await Promise.all([
    eventosPromise,
    eventosHoyPromise,
    sesion ? turnoDeHoyEmpleado(sesion.perfil.id) : Promise.resolve(null),
  ]);

  // Clasificar y ordenar por severidad (más crítico primero), luego por recencia.
  const enriquecidos = eventos
    .map((ev) => ({ ev, tipo: clasificarCodigo(ev.codigo) }))
    .sort((a, b) => {
      const sev = PRIORIDAD[b.tipo] - PRIORIDAD[a.tipo];
      if (sev !== 0) return sev;
      return b.ev.fecha_evento.getTime() - a.ev.fecha_evento.getTime();
    });

  const nuevos = eventos.filter((e) => e.estado === "NUEVO").length;
  const enEspera = eventos.filter((e) => e.estado === "EN_ESPERA").length;
  const enProceso = eventos.length - nuevos - enEspera;
  const metricasHoy = calcularMetricasDia(eventosHoy);

  return (
    <section aria-labelledby="cola-heading" className="space-y-6">
      <div>
        <h1 id="cola-heading" className="text-2xl font-bold text-white">
          Cola de eventos
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Señales sin cerrar, priorizadas por criticidad · {eventos.length} pendiente
          {eventos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Barra de turno: solo si el empleado logueado tiene turno hoy (sin ruido si no). */}
      {turnoHoy && sesion && (
        <div className="flex items-center gap-2 bg-industrial-800 border border-industrial-700 rounded-xl px-4 py-2.5 text-sm text-slate-300">
          <Clock className="w-4 h-4 text-tactical-400 shrink-0" aria-hidden />
          <span>
            Tu turno: <strong className="text-white">{FRANJA_META[turnoHoy.franja].label}</strong>{" "}
            <span className="text-slate-500">({FRANJA_META[turnoHoy.franja].horario})</span> ·{" "}
            {sesion.perfil.nombre}
          </span>
        </div>
      )}

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Nuevos", value: nuevos, cls: "text-red-300" },
          { label: "En proceso", value: enProceso, cls: "text-blue-300" },
          { label: "En espera", value: enEspera, cls: "text-amber-300" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-industrial-800 border border-industrial-700 rounded-xl px-4 py-3"
          >
            <p className={`text-2xl font-bold font-mono ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Métricas del día (colapsable) */}
      <details className="bg-industrial-800 border border-industrial-700 rounded-xl px-4 py-3 group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300 hover:text-white transition-colors">
          <Gauge className="w-4 h-4 text-tactical-400" aria-hidden />
          Métricas de hoy
        </summary>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-industrial-700">
          {[
            { label: "Atendidos", value: String(metricasHoy.atendidos), cls: "text-green-300" },
            { label: "Pendientes", value: String(metricasHoy.pendientes), cls: "text-amber-300" },
            {
              label: "Tiempo medio de toma",
              value: formatDuracion(metricasHoy.tiempoMedioTomaMs),
              cls: "text-blue-300",
            },
            {
              label: "Tiempo medio de resolución",
              value: formatDuracion(metricasHoy.tiempoMedioResolucionMs),
              cls: "text-slate-200",
            },
          ].map((m) => (
            <div key={m.label}>
              <p className={`text-xl font-bold font-mono ${m.cls}`}>{m.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </details>

      {/* Lista priorizada */}
      {enriquecidos.length === 0 ? (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-8 text-center">
          <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" aria-hidden />
          <p className="text-green-400 font-semibold text-lg">Central limpia</p>
          <p className="text-green-400/60 text-sm mt-1">
            No hay eventos sin procesar. Monitoreo al 100%.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {enriquecidos.map(({ ev, tipo }) => {
            const sev = SEVERIDAD[tipo];
            return (
              <li
                key={ev.id}
                className={`bg-industrial-800 border border-industrial-700 border-l-4 ${sev.borde} rounded-lg px-4 py-3`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {ev.cuenta?.perfil.nombre ?? ev.softguard_ref ?? "Cuenta s/asignar"}
                    </p>
                    <p className="text-slate-400 text-xs truncate">
                      {ev.descripcion}{" "}
                      <span className="font-mono text-slate-500">({ev.codigo})</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {ev.cuenta?.descripcion ?? "—"}
                      {ev.zona ? ` · Zona ${ev.zona}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${sev.chip}`}
                    >
                      {sev.label}
                    </span>
                    <p className="text-slate-500 text-xs mt-1 whitespace-nowrap">
                      {fmtFecha(ev.fecha_evento)}
                    </p>
                  </div>
                </div>
                <AccionEventoRapida id={ev.id} estado={ev.estado} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

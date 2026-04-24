import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { SensorItem } from "@/components/portal/SensorItem";
import { calcularEstadoFinanciero } from "@/lib/billing-state";
import type { EstadoPago } from "@/generated/prisma/client";

// ─── Fetch + tipos inferidos desde Prisma ────────────────────────────────────

async function fetchPerfil(perfilId: string) {
  return prisma.perfil.findUnique({
    where: { id: perfilId, rol: "CLIENTE" },
    include: {
      cuentas: {
        where: { estado: { not: "BAJA_DEFINITIVA" } },
        include: {
          sensores:    { orderBy: { codigo_zona: "asc" } },
          pagos:       { orderBy: [{ anio: "desc" }, { mes: "asc" }] },
          solicitudes: { orderBy: { creada_en: "desc" } },
        },
        orderBy: { descripcion: "asc" },
      },
    },
  });
}

type PerfilConDatos  = NonNullable<Awaited<ReturnType<typeof fetchPerfil>>>;
type CuentaConDatos  = PerfilConDatos["cuentas"][number];

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIA_LABELS: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma y monitoreo",
  DOMOTICA: "Domótica",
  CAMARA_CCTV: "Cámaras CCTV",
  ANTENA_STARLINK: "Antena StarLink",
  OTRO: "Otro",
};

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PAGO_CFG: Record<EstadoPago | "SIN_DATOS", { bg: string; text: string; icono: string; etiqueta: string }> = {
  VENCIDO:    { bg: "bg-orange-600",   text: "text-white",     icono: "⚠", etiqueta: "DEUDA" },
  PENDIENTE:  { bg: "bg-amber-700",    text: "text-white",     icono: "○", etiqueta: "PENDIENTE" },
  PROCESANDO: { bg: "bg-blue-700",     text: "text-white",     icono: "↻", etiqueta: "PROCESANDO" },
  PAGADO:     { bg: "bg-green-700",    text: "text-white",     icono: "✓", etiqueta: "ABONADO" },
  SIN_DATOS:  { bg: "bg-slate-700/50", text: "text-slate-500", icono: "",  etiqueta: "—" },
};

const ESTADO_SOL_CFG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-900/40 text-amber-400" },
  EN_PROCESO: { label: "En proceso", cls: "bg-blue-900/40 text-blue-400" },
  RESUELTA:   { label: "Resuelta",   cls: "bg-green-900/40 text-green-400" },
};

const PRIORIDAD_CFG: Record<string, { label: string; cls: string }> = {
  BAJA:  { label: "Baja",  cls: "text-slate-400" },
  MEDIA: { label: "Media", cls: "text-amber-400" },
  ALTA:  { label: "Alta",  cls: "text-red-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tiempoRelativo(fecha: Date): string {
  const diff = Date.now() - fecha.getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return "hace instantes";
  if (min < 60)  return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24)   return `hace ${hs}h`;
  const dias = Math.floor(hs / 24);
  if (dias === 1) return "ayer";
  if (dias < 30)  return `hace ${dias} días`;
  return fecha.toLocaleDateString("es-AR");
}

// ─── Calendario de pagos (solo lectura) ──────────────────────────────────────

function CalendarioPagosReadOnly({
  pagos,
  anio,
}: {
  pagos: CuentaConDatos["pagos"];
  anio: number;
}) {
  const porMes = new Map(
    pagos.filter((p) => p.anio === anio).map((p) => [p.mes, p])
  );

  return (
    <div
      className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
      role="list"
      aria-label={`Calendario de pagos ${anio}`}
    >
      {MESES_NOMBRES.map((nombre, idx) => {
        const mes  = idx + 1;
        const pago = porMes.get(mes);
        const cfg  = PAGO_CFG[pago?.estado ?? "SIN_DATOS"];
        const importeStr = pago?.importe
          ? `$${Number(pago.importe).toLocaleString("es-AR")}`
          : "";

        return (
          <div
            key={mes}
            role="listitem"
            className={`${cfg.bg} ${cfg.text} rounded-xl p-3 flex flex-col items-center gap-1 min-h-[110px]`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
              {nombre.slice(0, 3)}
            </span>
            {cfg.icono && (
              <span className="text-2xl leading-none font-bold" aria-hidden="true">
                {cfg.icono}
              </span>
            )}
            <span className="text-xs font-bold">{cfg.etiqueta}</span>
            {importeStr && (
              <span className="text-xs font-semibold opacity-90">{importeStr}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Panel de estado de sensores ─────────────────────────────────────────────

function PanelEstado({ sensores }: { sensores: CuentaConDatos["sensores"] }) {
  if (sensores.length === 0) return null;

  const activos        = sensores.filter((s) => s.activa).length;
  const batCritica     = sensores.filter((s) => s.bateria === "CRITICA").length;
  const batAdvertencia = sensores.filter((s) => s.bateria === "ADVERTENCIA").length;
  const enMant         = sensores.filter((s) => s.alerta_mant).length;

  const fechas = sensores
    .map((s) => s.ultima_activacion)
    .filter((f): f is Date => f !== null)
    .sort((a, b) => b.getTime() - a.getTime());
  const ultimaActivacion = fechas[0] ?? null;

  const hayProblemas    = batCritica > 0 || enMant > 0;
  const hayAdvertencias = batAdvertencia > 0;

  const estadoLabel = hayProblemas ? "Atención requerida" : hayAdvertencias ? "Atención sugerida" : "Sin alertas";
  const estadoCls   = hayProblemas
    ? "bg-red-900/30 border-red-800 text-red-400"
    : hayAdvertencias
    ? "bg-yellow-900/30 border-yellow-800 text-yellow-400"
    : "bg-green-900/30 border-green-800 text-green-400";
  const estadoIcon  = hayProblemas ? "⚠" : hayAdvertencias ? "◎" : "✓";

  return (
    <div className={`rounded-xl border px-5 py-4 ${estadoCls}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-semibold text-sm">{estadoIcon} {estadoLabel}</p>
        <span className="text-xs opacity-70">
          {activos}/{sensores.length} dispositivos activos
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs opacity-80">
        {ultimaActivacion && (
          <span>Última activación: {tiempoRelativo(ultimaActivacion)}</span>
        )}
        {batCritica > 0 && (
          <span>🔴 {batCritica} batería{batCritica > 1 ? "s" : ""} crítica{batCritica > 1 ? "s" : ""}</span>
        )}
        {batAdvertencia > 0 && (
          <span>🟡 {batAdvertencia} batería{batAdvertencia > 1 ? "s" : ""} baja{batAdvertencia > 1 ? "s" : ""}</span>
        )}
        {enMant > 0 && (
          <span>🔧 {enMant} dispositivo{enMant > 1 ? "s" : ""} con alerta de mantenimiento</span>
        )}
        {!hayProblemas && !hayAdvertencias && (
          <span>Todos los dispositivos funcionando correctamente</span>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function TabDashboard({
  perfil,
  cuentas,
}: {
  perfil: Pick<PerfilConDatos, "nombre">;
  cuentas: CuentaConDatos[];
}) {
  const primerNombre = perfil.nombre.split(" ")[0];

  return (
    <section aria-labelledby="dash-heading">
      <h1 id="dash-heading" className="text-2xl font-bold text-white mb-2">
        Hola, {primerNombre}
      </h1>
      <p className="text-slate-400 mb-8">
        Tus servicios contratados con Escobar Instalaciones.
      </p>

      {cuentas.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <p className="text-slate-300 mb-4">No tenés servicios activos.</p>
          <span className="inline-block bg-orange-500/40 text-orange-200 px-6 py-3 rounded-lg font-medium text-sm">
            Contactar Escobar Instalaciones
          </span>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" role="list">
          {cuentas.map((cuenta) => {
            const estadoFinanciero = calcularEstadoFinanciero(
              cuenta.estado,
              cuenta.pagos,
              cuenta.override_activo,
              cuenta.override_expira
            );

            let badgeBg: string, badgeText: string, badgeLabel: string;
            if (cuenta.estado === "EN_MANTENIMIENTO") {
              badgeBg = "bg-yellow-900/40"; badgeText = "text-yellow-400"; badgeLabel = "En mantenimiento";
            } else if (cuenta.estado === "BAJA_DEFINITIVA") {
              badgeBg = "bg-slate-700"; badgeText = "text-slate-400"; badgeLabel = "Baja";
            } else if (estadoFinanciero.tipo === "GRACE_PERIOD") {
              badgeBg = "bg-amber-900/40"; badgeText = "text-amber-400";
              badgeLabel = `${estadoFinanciero.dias_mora} día${estadoFinanciero.dias_mora !== 1 ? "s" : ""} de mora`;
            } else if (estadoFinanciero.tipo === "SUSPENDED") {
              badgeBg = "bg-red-900/40"; badgeText = "text-red-400"; badgeLabel = "Suspendida";
            } else if (estadoFinanciero.tipo === "PAYMENT_IN_REVIEW") {
              badgeBg = "bg-blue-900/40"; badgeText = "text-blue-400"; badgeLabel = "Pago en revisión";
            } else {
              badgeBg = "bg-green-900/40"; badgeText = "text-green-400"; badgeLabel = "Al día";
            }

            const tieneAlertaMant = cuenta.sensores.some((s) => s.alerta_mant);

            return (
              <li key={cuenta.id}>
                <Link
                  href={`?tab=cuenta&cuentaId=${cuenta.id}`}
                  className="block bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-orange-500 hover:bg-slate-800/80 transition-all group"
                  aria-label={`Ver detalle de ${cuenta.descripcion} — ${badgeLabel}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="font-semibold text-white text-lg leading-snug group-hover:text-orange-400 transition-colors">
                      {cuenta.descripcion}
                    </h2>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badgeBg} ${badgeText}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    {CATEGORIA_LABELS[cuenta.categoria] ?? cuenta.categoria}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {estadoFinanciero.tipo === "SUSPENDED" && (
                      <span className="text-xs font-medium text-red-400 bg-red-900/40 px-2 py-1 rounded-full">
                        ⚠ Pagar para reactivar
                      </span>
                    )}
                    {estadoFinanciero.tipo === "GRACE_PERIOD" && (
                      <span className="text-xs font-medium text-amber-400 bg-amber-900/40 px-2 py-1 rounded-full">
                        ○ Pago pendiente
                      </span>
                    )}
                    {estadoFinanciero.tipo === "PAYMENT_IN_REVIEW" && (
                      <span className="text-xs font-medium text-blue-400 bg-blue-900/40 px-2 py-1 rounded-full">
                        🔄 Verificando pago
                      </span>
                    )}
                    {tieneAlertaMant && (
                      <span className="text-xs font-medium text-yellow-400 bg-yellow-900/40 px-2 py-1 rounded-full">
                        🔧 Mantenimiento
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href="?tab=pagos"
          className="inline-flex items-center gap-2 text-orange-400 font-medium hover:underline min-h-[44px] transition-colors"
        >
          Ver historial de pagos →
        </Link>
      </div>
    </section>
  );
}

// ─── Tab: Cuenta (detalle de una cuenta) ─────────────────────────────────────

function TabCuenta({ cuenta }: { cuenta: CuentaConDatos }) {
  const pagoPendiente = cuenta.pagos.find(
    (p) => p.estado === "PENDIENTE" || p.estado === "VENCIDO"
  );
  const solicitudesAbiertas = cuenta.solicitudes.filter((s) => s.estado !== "RESUELTA");

  return (
    <div className="space-y-8">
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="?tab=dashboard" className="hover:text-white transition-colors">
              Mis servicios
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium truncate max-w-[200px]">
            {cuenta.descripcion}
          </li>
        </ol>
      </nav>

      <section aria-labelledby="cuenta-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 id="cuenta-heading" className="text-2xl font-bold text-white">
              {cuenta.descripcion}
            </h1>
            <p className="text-slate-400 mt-1">
              {CATEGORIA_LABELS[cuenta.categoria] ?? cuenta.categoria}
            </p>
          </div>
          {pagoPendiente && (
            <span className="inline-flex items-center gap-2 bg-red-600/50 text-red-200 px-5 py-3 rounded-lg font-semibold text-sm border border-red-700/50">
              ⚠ Pago pendiente — ${Number(pagoPendiente.importe).toLocaleString("es-AR")}
            </span>
          )}
        </div>
      </section>

      {cuenta.sensores.length > 0 && <PanelEstado sensores={cuenta.sensores} />}

      {solicitudesAbiertas.length > 0 && (
        <section aria-labelledby="sol-abiertas-heading">
          <h2 id="sol-abiertas-heading" className="text-lg font-semibold text-white mb-3">
            Solicitudes en curso
          </h2>
          <div className="space-y-2">
            {solicitudesAbiertas.map((s) => (
              <div
                key={s.id}
                className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="text-slate-300 text-sm truncate">{s.descripcion}</p>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                  s.estado === "EN_PROCESO" ? "bg-blue-900/40 text-blue-400" : "bg-amber-900/40 text-amber-400"
                }`}>
                  {s.estado === "EN_PROCESO" ? "En proceso" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="?tab=solicitudes"
            className="text-xs text-orange-400 hover:text-orange-300 mt-2 inline-block transition-colors"
          >
            Ver historial completo →
          </Link>
        </section>
      )}

      <section aria-labelledby="sensores-heading">
        <h2 id="sensores-heading" className="text-lg font-semibold text-white mb-4">
          Dispositivos instalados
        </h2>
        {cuenta.sensores.length === 0 ? (
          <p className="text-slate-400">No hay dispositivos registrados.</p>
        ) : (
          <ul className="space-y-3" role="list" aria-label="Lista de sensores">
            {cuenta.sensores.map((sensor) => (
              <SensorItem key={sensor.id} sensor={sensor} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mant-heading">
        <h2 id="mant-heading" className="text-lg font-semibold text-white mb-4">
          ¿Algo no funciona bien?
        </h2>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 bg-slate-700/40 text-slate-500 px-6 py-3 rounded-lg font-medium border border-slate-700 text-sm cursor-not-allowed">
            Solicitar asistencia técnica
          </span>
          <Link
            href="?tab=solicitudes"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white px-6 py-3 rounded-lg font-medium border border-slate-700 hover:border-slate-500 transition-colors text-sm"
          >
            Ver mis solicitudes
          </Link>
        </div>
        <p className="text-xs text-orange-400/70 mt-2">
          Vista admin — acciones interactivas deshabilitadas
        </p>
      </section>
    </div>
  );
}

// ─── Tab: Pagos ───────────────────────────────────────────────────────────────

function TabPagos({
  cuentas,
  anio,
  aniosDisponibles,
}: {
  cuentas: CuentaConDatos[];
  anio: number;
  aniosDisponibles: number[];
}) {
  return (
    <section aria-labelledby="pagos-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 id="pagos-heading" className="text-2xl font-bold text-white">
          Historial de pagos
        </h1>
        {aniosDisponibles.length > 1 && (
          <form method="GET">
            <input type="hidden" name="tab" value="pagos" />
            <label htmlFor="anio-sel" className="sr-only">Seleccionar año</label>
            <div className="flex items-center gap-2">
              <select
                id="anio-sel"
                name="anio"
                defaultValue={anio}
                className="bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-base min-h-[52px] focus:outline-2 focus:outline-orange-500"
              >
                {aniosDisponibles.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-5 py-3 rounded-xl text-base min-h-[52px] transition-colors font-semibold"
              >
                Ver
              </button>
            </div>
          </form>
        )}
      </div>

      {cuentas.length === 0 ? (
        <p className="text-slate-400 text-lg">No tenés servicios activos.</p>
      ) : (
        <div className="space-y-10">
          {cuentas.map((cuenta) => (
            <div key={cuenta.id}>
              <h2 className="text-lg font-semibold text-white mb-4">
                {cuenta.descripcion}
              </h2>
              <CalendarioPagosReadOnly pagos={cuenta.pagos} anio={anio} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Tab: Solicitudes ─────────────────────────────────────────────────────────

function TabSolicitudes({ cuentas }: { cuentas: CuentaConDatos[] }) {
  const todas = cuentas
    .flatMap((c) => c.solicitudes.map((s) => ({ ...s, cuentaDesc: c.descripcion })))
    .sort((a, b) => new Date(b.creada_en).getTime() - new Date(a.creada_en).getTime());

  const abiertas  = todas.filter((s) => s.estado !== "RESUELTA");
  const resueltas = todas.filter((s) => s.estado === "RESUELTA");

  return (
    <section className="space-y-8" aria-labelledby="sol-heading">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 id="sol-heading" className="text-2xl font-bold text-white">
            Mis solicitudes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Historial de asistencia técnica solicitada.
          </p>
        </div>
        <span className="shrink-0 bg-orange-500/20 text-orange-300/60 font-semibold px-5 py-3 rounded-lg text-sm border border-orange-700/20 cursor-not-allowed">
          + Nueva solicitud
        </span>
      </div>

      {todas.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
          <p className="text-slate-400">No hay solicitudes registradas.</p>
        </div>
      ) : (
        <>
          {abiertas.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-300 mb-3">
                Abiertas ({abiertas.length})
              </h2>
              <div className="space-y-3">
                {abiertas.map((s) => (
                  <SolicitudCardPreview key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
          {resueltas.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-300 mb-3">
                Resueltas ({resueltas.length})
              </h2>
              <div className="space-y-3">
                {resueltas.map((s) => (
                  <SolicitudCardPreview key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <p className="text-xs text-orange-400/70">
        Vista admin — acciones interactivas deshabilitadas
      </p>
    </section>
  );
}

function SolicitudCardPreview({
  s,
}: {
  s: CuentaConDatos["solicitudes"][number] & { cuentaDesc: string };
}) {
  const estado    = ESTADO_SOL_CFG[s.estado]   ?? { label: s.estado, cls: "bg-slate-700 text-slate-300" };
  const prioridad = PRIORIDAD_CFG[s.prioridad] ?? { label: s.prioridad, cls: "text-slate-400" };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-orange-400">{s.cuentaDesc}</p>
          <p className="text-white font-medium mt-0.5 leading-snug">{s.descripcion}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${estado.cls}`}>
          {estado.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
        <span>
          Prioridad:{" "}
          <span className={`font-medium ${prioridad.cls}`}>{prioridad.label}</span>
        </span>
        <span>
          {new Date(s.creada_en).toLocaleDateString("es-AR", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
        {s.resuelta_en && (
          <span className="text-green-500">
            Resuelta el{" "}
            {new Date(s.resuelta_en).toLocaleDateString("es-AR", {
              day: "numeric", month: "short",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type ValidTab = "dashboard" | "cuenta" | "pagos" | "solicitudes";
const TABS_VALIDOS: ValidTab[] = ["dashboard", "cuenta", "pagos", "solicitudes"];

export default async function VistaClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ perfilId: string }>;
  searchParams: Promise<{ tab?: string; cuentaId?: string; anio?: string }>;
}) {
  const { perfilId }                              = await params;
  const { tab: tabRaw, cuentaId, anio: anioStr } = await searchParams;

  const activeTab: ValidTab = TABS_VALIDOS.includes(tabRaw as ValidTab)
    ? (tabRaw as ValidTab)
    : "dashboard";

  const anioActual = new Date().getFullYear();
  const anio       = Number(anioStr) || anioActual;

  const perfil = await fetchPerfil(perfilId);
  if (!perfil) notFound();

  const cuentas = perfil.cuentas;

  const todosLosAnios = [
    ...new Set([anioActual, ...cuentas.flatMap((c) => c.pagos.map((p) => p.anio))]),
  ].sort((a, b) => b - a);

  const cuentaActiva = activeTab === "cuenta" && cuentaId
    ? (cuentas.find((c) => c.id === cuentaId) ?? null)
    : null;

  const NAV_TABS = [
    { key: "dashboard",   label: "Mis servicios" },
    { key: "pagos",       label: "Pagos" },
    { key: "solicitudes", label: "Solicitudes" },
  ] as const;

  const isActiveNav = (key: string) =>
    activeTab === key || (key === "dashboard" && activeTab === "cuenta");

  return (
    <div>
      {/* ── Breadcrumb admin ──────────────────────────────────────────────── */}
      <nav
        aria-label="Contexto admin — vista de portal"
        className="flex items-center justify-between gap-3 mb-4"
      >
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/clientes" className="hover:text-white transition-colors">
              Clientes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/admin/clientes/${perfilId}`}
              className="hover:text-white transition-colors"
            >
              {perfil.nombre}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium">Vista portal</li>
        </ol>
        <Link
          href={`/admin/clientes/${perfilId}`}
          className="text-sm text-slate-400 hover:text-white transition-colors shrink-0"
        >
          ← Volver al cliente
        </Link>
      </nav>

      {/* ── Frame del portal simulado ─────────────────────────────────────── */}
      <div className="rounded-xl border border-orange-800/40 overflow-hidden">
        {/* Banner de contexto admin */}
        <div
          role="status"
          className="bg-orange-950/80 border-b border-orange-800/40 px-4 py-2 flex items-center gap-3"
        >
          <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded uppercase tracking-wide shrink-0">
            Vista admin
          </span>
          <span className="text-orange-200 text-xs">
            Estás viendo el portal de{" "}
            <strong className="font-semibold">{perfil.nombre}</strong>
            {" "}exactamente como lo vería el cliente — solo lectura
          </span>
        </div>

        {/* Nav simulada del portal */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center gap-1">
          {NAV_TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`?tab=${key}`}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActiveNav(key)
                  ? "bg-orange-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Contenido */}
        <div className="bg-slate-900 p-6 min-h-[400px]">
          {activeTab === "dashboard" && (
            <TabDashboard perfil={perfil} cuentas={cuentas} />
          )}

          {activeTab === "cuenta" && cuentaActiva && (
            <TabCuenta cuenta={cuentaActiva} />
          )}

          {activeTab === "cuenta" && !cuentaActiva && (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-4">Cuenta no encontrada.</p>
              <Link href="?tab=dashboard" className="text-orange-400 hover:text-orange-300 transition-colors">
                ← Volver al dashboard
              </Link>
            </div>
          )}

          {activeTab === "pagos" && (
            <TabPagos
              cuentas={cuentas}
              anio={anio}
              aniosDisponibles={todosLosAnios}
            />
          )}

          {activeTab === "solicitudes" && (
            <TabSolicitudes cuentas={cuentas} />
          )}
        </div>
      </div>
    </div>
  );
}

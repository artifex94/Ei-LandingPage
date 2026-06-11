import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { MultiMonitorLive } from "@/components/admin/MultiMonitorLive";
import { softguardWebApiConfigured, fetchEventosPendientes } from "@/lib/softguard/web-api";

export const metadata: Metadata = { title: "Dashboard" };

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADOS_OT_ACTIVOS = ["SOLICITADA", "ASIGNADA", "EN_RUTA", "EN_SITIO"] as const;
const ESTADOS_EVENTO_ABIERTOS = ["NUEVO", "EN_PROCESO", "EN_ESPERA", "EN_PROCESO_DESDE_ESPERA", "EN_PROCESO_MULTIPLE"] as const;

const TUTORIAL_DASHBOARD = [
  {
    titulo: "La alerta única",
    descripcion: "Si hay algo urgente, aparece una sola línea arriba. Solo lo más crítico. Si no hay nada urgente, no hay banner.",
  },
  {
    titulo: "Tres métricas",
    descripcion: "Cobros del mes, estado de cuentas y pendientes de gestión. Con esas tres sabés cómo está el negocio en 5 segundos.",
  },
  {
    titulo: "Multimonitoreo",
    descripcion: "Los últimos eventos de la central en vivo, con su estado: pendiente (ámbar) o procesado. Al lado, los operadores que los vigilan y la cobertura del día.",
  },
  {
    titulo: "Técnicos en campo",
    descripcion: "La sección inferior muestra el estado operativo del equipo técnico y sus OT activas.",
  },
];

export default async function AdminDashboardPage() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  const inicioDia = new Date(hoy); inicioDia.setHours(0, 0, 0, 0);
  const finDia    = new Date(hoy); finDia.setHours(23, 59, 59, 999);

  const [
    totalActivas,
    suspendidas,
    enMantenimiento,
    solicitudesPendientes,
    cambiosPendientes,
    eventosSinProcesar,
    otsActivas,
    turnosHoy,
    pagosEsteMes,
    morosos,
    altasUsuarioPendientes,
    tecnicosOperativos,
    tareasTecnicasHoy,
    monitoresOperativos,
    eventosHoy,
    eventosMonitoreoAbiertos,
  ] = await Promise.all([
    prisma.cuenta.count({ where: { estado: "ACTIVA" } }),
    prisma.cuenta.count({ where: { estado: "SUSPENDIDA_PAGO" } }),
    prisma.cuenta.count({ where: { estado: "EN_MANTENIMIENTO" } }),
    prisma.solicitudMantenimiento.count({ where: { estado: { not: "RESUELTA" } } }),
    prisma.solicitudCambioInfo.count({ where: { estado: "PENDIENTE" } }),
    prisma.eventoAlarma.count({ where: { estado: "NUEVO" } }),
    prisma.ordenTrabajo.count({ where: { estado: { in: [...ESTADOS_OT_ACTIVOS] } } }),
    prisma.turno.findMany({
      where: { fecha: { gte: inicioDia, lte: finDia } },
      include: { empleado: { include: { perfil: { select: { nombre: true } } } } },
      orderBy: { franja: "asc" },
    }),
    prisma.pago.groupBy({
      by: ["estado"],
      where: { anio, mes },
      _count: { estado: true },
      _sum: { importe: true },
    }),
    prisma.pago.groupBy({
      by: ["cuenta_id"],
      where: {
        OR: [
          { estado: "VENCIDO" },
          { estado: "PENDIENTE", OR: [{ anio: { lt: anio } }, { anio, mes: { lt: mes } }] },
        ],
      },
      _count: { cuenta_id: true },
      having: { cuenta_id: { _count: { gte: 2 } } },
    }),
    prisma.altaUsuario.count({ where: { estado: "PENDIENTE" } }),
    prisma.empleado.findMany({
      where: { activo: true, OR: [{ rol_empleado: "TECNICO" }, { puede_instalar: true }] },
      include: {
        perfil: { select: { id: true, nombre: true, telefono: true } },
        turnos: { where: { fecha: { gte: inicioDia, lte: finDia } }, orderBy: { franja: "asc" } },
        ordenes_trabajo: {
          where: { estado: { in: ["ASIGNADA", "EN_RUTA", "EN_SITIO"] } },
          include: {
            cuenta: { select: { descripcion: true, localidad: true } },
            perfil: { select: { nombre: true } },
          },
          orderBy: { updated_at: "desc" },
          take: 3,
        },
      },
      orderBy: { created_at: "asc" },
    }),
    prisma.tareaAgendada.findMany({
      where: { fecha: { gte: inicioDia, lte: finDia }, estado: { not: "CANCELADA" } },
      include: {
        tecnico: { select: { id: true, nombre: true } },
        cuenta: { select: { descripcion: true } },
        ot: { select: { numero: true, estado: true } },
      },
      orderBy: [{ estado: "asc" }, { hora_inicio: "asc" }],
    }),
    prisma.empleado.findMany({
      where: { activo: true, OR: [{ rol_empleado: "MONITOR" }, { puede_monitorear: true }] },
      include: {
        perfil: { select: { nombre: true } },
        turnos: { where: { fecha: { gte: inicioDia, lte: finDia } }, orderBy: { franja: "asc" } },
      },
      orderBy: { created_at: "asc" },
    }),
    prisma.eventoAlarma.findMany({
      where: { fecha_evento: { gte: inicioDia, lte: finDia } },
      select: { operador_softguard: true },
    }),
    prisma.eventoAlarma.count({ where: { estado: { in: [...ESTADOS_EVENTO_ABIERTOS] } } }),
  ]);

  // ── Derivaciones ────────────────────────────────────────────────────────────
  const cobradoEsteMes = pagosEsteMes
    .filter((p) => p.estado === "PAGADO")
    .reduce((s, p) => s + Number(p._sum.importe ?? 0), 0);

  const countPagado  = pagosEsteMes.find((p) => p.estado === "PAGADO")?._count.estado ?? 0;
  const countVencido = pagosEsteMes.find((p) => p.estado === "VENCIDO")?._count.estado ?? 0;

  const pctCobros = totalActivas > 0 ? Math.min(100, Math.round((countPagado / totalActivas) * 100)) : 0;

  const totalPendientes = solicitudesPendientes + altasUsuarioPendientes + cambiosPendientes;

  // Una sola fuente de verdad para "¿hay algo urgente?": la cola viva de la
  // central (la misma que muestra el multimonitor). Si la API no responde en
  // 4 s o no está configurada, cae al conteo local sincronizado por el cron.
  let eventosUrgentes = eventosSinProcesar;
  if (softguardWebApiConfigured()) {
    try {
      const pendientes = await Promise.race([
        fetchEventosPendientes(undefined, 200).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4_000)),
      ]);
      if (pendientes !== null) eventosUrgentes = pendientes.length;
    } catch {
      // fallback silencioso al conteo local
    }
  }

  const alertaUrgente = eventosUrgentes > 0
    ? {
        tipo: "critico" as const,
        texto: `${eventosUrgentes} evento${eventosUrgentes > 1 ? "s" : ""} de alarma sin procesar`,
        href: "/admin/eventos?estado=NUEVO",
      }
    : turnosHoy.length === 0
    ? {
        tipo: "alerta" as const,
        texto: "Sin turnos de monitoreo asignados hoy",
        href: "/admin/turnos",
      }
    : null;

  const eventosPorOperador = Object.entries(
    eventosHoy.reduce<Record<string, number>>((acc, evento) => {
      const key = evento.operador_softguard ? `Op. ${evento.operador_softguard}` : "Sin operador";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([operador, total]) => ({ operador, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // ── Ops score diario ──────────────────────────────────────────────────────
  const opsScore = Math.min(100, Math.round(
    (eventosUrgentes === 0 ? 30 : Math.max(0, 30 - eventosUrgentes * 6)) +
    Math.round((pctCobros / 100) * 45) +
    (totalPendientes === 0 ? 25 : Math.max(0, 25 - totalPendientes * 4))
  ));

  const scoreColor =
    opsScore >= 90 ? "text-emerald-400" :
    opsScore >= 70 ? "text-white" :
    "text-amber-400";

  const scoreLabel =
    opsScore >= 90 ? "Excelente" :
    opsScore >= 70 ? "Bueno" :
    opsScore >= 50 ? "Regular" :
    "Atención";

  return (
    <section className="space-y-7">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Dashboard</h1>
          <time
            dateTime={hoy.toISOString().slice(0, 10)}
            className="text-xs text-slate-500 mt-0.5 block"
          >
            {hoy.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(/^\w/, c => c.toUpperCase())}
          </time>
        </div>

        {/* Ops Score */}
        <div className="text-right shrink-0">
          <p className={`text-3xl font-display font-bold tabular-nums leading-none ${scoreColor}`}>{opsScore}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-0.5">{scoreLabel}</p>
        </div>
      </div>

      {/* ── Alerta única ───────────────────────────────────────────────────── */}
      {alertaUrgente && (
        <Link
          href={alertaUrgente.href}
          className={`group flex items-center justify-between gap-3 rounded-xl border px-5 py-4 transition-all duration-200 ${
            alertaUrgente.tipo === "critico"
              ? "border-red-700/70 bg-red-950/40 hover:border-red-600/80 hover:bg-red-950/55"
              : "border-amber-700/60 bg-amber-950/30 hover:border-amber-600/70 hover:bg-amber-950/45"
          }`}
          style={{
            boxShadow: alertaUrgente.tipo === "critico"
              ? "0 0 24px rgba(239,68,68,0.08), inset 0 1px 0 rgba(239,68,68,0.1)"
              : "0 0 24px rgba(245,158,11,0.06), inset 0 1px 0 rgba(245,158,11,0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                alertaUrgente.tipo === "critico"
                  ? "bg-red-500 animate-led-crit"
                  : "bg-amber-500 animate-led-alert"
              }`}
              aria-hidden="true"
            />
            <p className={`text-sm font-semibold ${alertaUrgente.tipo === "critico" ? "text-red-200" : "text-amber-200"}`}>
              {alertaUrgente.texto}
            </p>
          </div>
          <span className={`text-xs font-bold shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
            alertaUrgente.tipo === "critico" ? "text-red-400" : "text-amber-400"
          }`}>
            Atender →
          </span>
        </Link>
      )}

      {/* ── Tres métricas ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* ── Cobros ── */}
        <Link
          href="/admin/pagos"
          className={`group relative rounded-xl border overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 ${
            pctCobros === 100
              ? "border-emerald-700/50 bg-gradient-to-br from-emerald-950/40 to-slate-900/80"
              : "border-slate-700/60 bg-gradient-to-br from-slate-800/80 to-slate-900/60 hover:border-slate-600"
          }`}
        >
          {/* Accent line */}
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background: pctCobros === 100
                ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.7), transparent)"
                : "linear-gradient(90deg, transparent, rgba(241,119,32,0.6), transparent)",
            }}
            aria-hidden="true"
          />

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Cobros — {MESES[mes]}
          </p>
          <p className="text-4xl font-black text-white tabular-nums mt-2 leading-none tracking-tight">
            {formatArs(cobradoEsteMes)}
          </p>

          <div
            className="mt-4 h-2 rounded-full bg-slate-700/60 overflow-hidden"
            role="progressbar"
            aria-valuenow={pctCobros}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pctCobros}% cobrado`}
          >
            <div
              className="h-full rounded-full admin-progreso-barra"
              style={{
                "--target-width": `${pctCobros}%`,
                backgroundColor: pctCobros === 100 ? "rgb(52 211 153)" : "rgb(241 119 32)",
                boxShadow: pctCobros > 0
                  ? pctCobros === 100
                    ? "0 0 10px rgba(52,211,153,0.5)"
                    : "0 0 10px rgba(241,119,32,0.45)"
                  : "none",
              } as React.CSSProperties}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">{countPagado} de {totalActivas} cuentas</span>
            <span className={`font-bold tabular-nums ${pctCobros === 100 ? "text-emerald-400" : "text-orange-400"}`}>
              {pctCobros}%
            </span>
          </div>
          {countVencido > 0 && (
            <p className="mt-1 text-xs text-amber-400/80">{countVencido} con pagos vencidos</p>
          )}
        </Link>

        {/* ── Cuentas ── */}
        <Link
          href="/admin/cuentas"
          className="group relative rounded-xl border border-slate-700/60 overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-900/60 p-5 transition-all duration-200 hover:border-slate-600 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0"
        >
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.3), transparent)" }}
            aria-hidden="true"
          />

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Cuentas activas
          </p>
          <p className="text-4xl font-black text-white tabular-nums mt-2 leading-none tracking-tight">
            {totalActivas}
          </p>

          <div className="mt-4 space-y-1 text-xs">
            {suspendidas > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-amber-300/90">{suspendidas} suspendidas</span>
              </div>
            )}
            {morosos.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600/70 flex-shrink-0" />
                <span className="text-amber-400/80">{morosos.length} en mora</span>
              </div>
            )}
            {enMantenimiento > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 flex-shrink-0" />
                <span className="text-slate-400">{enMantenimiento} en mantenimiento</span>
              </div>
            )}
            {suspendidas === 0 && morosos.length === 0 && enMantenimiento === 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-emerald-400">sin alertas</span>
              </div>
            )}
          </div>
        </Link>

        {/* ── Por resolver ── */}
        <Link
          href={totalPendientes > 0 ? "/admin/mantenimiento" : "/admin/clientes"}
          className={`group relative rounded-xl border overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 ${
            totalPendientes > 0
              ? "border-amber-700/50 bg-gradient-to-br from-amber-950/30 to-slate-900/70 hover:border-amber-600/60"
              : "border-emerald-800/40 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 hover:border-emerald-700/50"
          }`}
        >
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background: totalPendientes > 0
                ? "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)"
                : "linear-gradient(90deg, transparent, rgba(52,211,153,0.4), transparent)",
            }}
            aria-hidden="true"
          />

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Por resolver
          </p>
          <p className={`text-4xl font-black tabular-nums mt-2 leading-none tracking-tight ${
            totalPendientes > 0 ? "text-amber-300" : "text-emerald-400"
          }`}>
            {totalPendientes}
          </p>

          <div className="mt-4 text-xs">
            {totalPendientes === 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-emerald-400">todo al día</span>
              </div>
            ) : (
              <p className="text-slate-400 leading-relaxed">
                {buildPendientesDesc(solicitudesPendientes, altasUsuarioPendientes, cambiosPendientes)}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* ── Operación en vivo: eventos de la central + quién los vigila ────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Multimonitoreo */}
        <MultiMonitorLive limit={8} />

        {/* Central de monitoreo */}
        <section className="rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/40 p-5">
          <SectionHeader
            title="Central de monitoreo"
            href="/admin/eventos"
            linkLabel={
              eventosMonitoreoAbiertos > 0
                ? `${eventosMonitoreoAbiertos} abiertos`
                : "Ver eventos"
            }
          />

          {monitoresOperativos.length === 0 ? (
            <EmptyState text="No hay operadores de monitoreo configurados." />
          ) : (
            <div className="space-y-2">
              {monitoresOperativos.map((monitor) => {
                const turnoActivo = monitor.turnos.find((t) => t.estado === "EN_CURSO") ?? monitor.turnos[0];
                const activo = turnoActivo?.estado === "EN_CURSO";
                return (
                  <div
                    key={monitor.id}
                    className="relative flex items-center justify-between gap-3 rounded-lg border border-slate-700/40 bg-slate-900/70 overflow-hidden px-4 py-3"
                    style={{
                      borderLeft: `2px solid ${activo ? "rgba(52,211,153,0.5)" : "rgba(51,65,85,0.4)"}`,
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{monitor.perfil.nombre}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {turnoActivo
                          ? `${franjaTurno(turnoActivo.franja)} · ${estadoTurno(turnoActivo.estado)}`
                          : "Sin turno hoy"}
                      </p>
                    </div>
                    <StatusPill estado={turnoActivo?.estado ?? "SIN_TURNO"} />
                  </div>
                );
              })}
            </div>
          )}

          {turnosHoy.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Cobertura hoy
                </p>
                <Link href="/admin/turnos" className="text-[11px] font-semibold text-slate-500 hover:text-orange-400 transition-colors">
                  Gestionar →
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {turnosHoy.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${franjaStyle(t.franja)}`}
                  >
                    <span className="font-bold">{franjaTurno(t.franja)}</span>
                    <span className="opacity-30">·</span>
                    <span className="font-normal opacity-90">{t.empleado.perfil.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {eventosPorOperador.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">
                Eventos hoy por operador
              </p>
              <div className="space-y-1.5">
                {eventosPorOperador.map((op) => (
                  <div key={op.operador} className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 flex-1 truncate">{op.operador}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1 rounded-full bg-orange-500/50"
                        style={{ width: `${Math.max(16, (op.total / (eventosPorOperador[0]?.total ?? 1)) * 48)}px` }}
                        aria-hidden="true"
                      />
                      <span className="font-bold text-white tabular-nums w-6 text-right">{op.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Técnicos en campo ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/40 p-5">
          <SectionHeader
            title="Técnicos en campo"
            href="/admin/ot"
            linkLabel={otsActivas > 0 ? `Ver OT (${otsActivas})` : "Ver OT"}
          />
          {tecnicosOperativos.length === 0 ? (
            <EmptyState text="No hay técnicos activos configurados." />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
              {tecnicosOperativos.map((tecnico) => {
                const turnoActivo = tecnico.turnos.find((t) => t.estado === "EN_CURSO") ?? tecnico.turnos[0];
                const otPrincipal = tecnico.ordenes_trabajo[0];
                const tareasDelTecnico = tareasTecnicasHoy.filter((t) => t.tecnico_id === tecnico.perfil.id);
                const estado = otPrincipal?.estado ?? turnoActivo?.estado ?? "SIN_TURNO";
                const activo = ["EN_RUTA", "EN_SITIO", "EN_CURSO"].includes(estado);

                return (
                  <div
                    key={tecnico.id}
                    className="relative rounded-lg border border-slate-700/40 bg-slate-900/70 overflow-hidden pl-4 pr-4 pt-3.5 pb-3"
                    style={{
                      borderLeft: `2px solid ${activo ? "rgba(52,211,153,0.5)" : "rgba(51,65,85,0.4)"}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{tecnico.perfil.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {turnoActivo
                            ? `${franjaTurno(turnoActivo.franja)} · ${estadoTurno(turnoActivo.estado)}`
                            : "Sin turno hoy"}
                        </p>
                      </div>
                      <StatusPill estado={estado} />
                    </div>

                    {otPrincipal ? (
                      <Link
                        href="/admin/ot"
                        className="mt-3 block rounded-md border border-slate-700/40 bg-slate-950/50 px-3 py-2 hover:border-slate-600/50 hover:bg-slate-950/70 transition-colors group/ot"
                      >
                        <p className="text-xs font-semibold text-slate-200 group-hover/ot:text-white transition-colors">
                          OT #{otPrincipal.numero} · {tipoOT(otPrincipal.tipo)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {otPrincipal.cuenta?.descripcion ?? otPrincipal.perfil?.nombre ?? "—"}
                        </p>
                      </Link>
                    ) : (
                      <p className="mt-2.5 text-xs text-slate-600">Sin OT activa.</p>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center gap-4 text-xs text-slate-600">
                      <span className={tecnico.ordenes_trabajo.length > 0 ? "text-slate-400" : ""}>
                        {tecnico.ordenes_trabajo.length} OT
                      </span>
                      <span className={tareasDelTecnico.length > 0 ? "text-slate-400" : ""}>
                        {tareasDelTecnico.length} tareas hoy
                      </span>
                      {turnoActivo?.checkin_at && (
                        <span className="text-emerald-500 ml-auto font-medium">✓ check-in</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      <TutorialContextual
        section="dashboard"
        titulo="Guía rápida — Dashboard"
        steps={TUTORIAL_DASHBOARD}
      />
    </section>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatArs(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

function buildPendientesDesc(sol: number, altas: number, cambios: number): string {
  const parts: string[] = [];
  if (sol > 0)    parts.push(`${sol} manten.`);
  if (altas > 0)  parts.push(`${altas} alta${altas > 1 ? "s" : ""}`);
  if (cambios > 0) parts.push(`${cambios} cambio${cambios > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/50">
      <h2 className="text-sm font-semibold text-white tracking-tight">{title}</h2>
      <Link
        href={href}
        className="text-[11px] font-semibold text-slate-500 hover:text-orange-400 transition-colors"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

function StatusPill({ estado }: { estado: string }) {
  const active = estado === "EN_CURSO" || estado === "EN_RUTA" || estado === "EN_SITIO";
  const inactive = estado === "SIN_TURNO" || estado === "AUSENTE";

  const cls = active
    ? "text-emerald-300 bg-emerald-950/60 border-emerald-700/40"
    : inactive
    ? "text-slate-600 bg-slate-900/40 border-slate-700/30"
    : "text-slate-400 bg-slate-900/50 border-slate-700/40";

  return (
    <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${cls}`}>
      {estadoLabel(estado)}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-xs text-slate-600 py-4">{text}</p>;
}

function franjaTurno(franja: string): string {
  return { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" }[franja] ?? franja;
}

function franjaStyle(franja: string): string {
  return (
    {
      MANANA: "border-yellow-700/50 bg-yellow-950/30 text-yellow-300",
      TARDE:  "border-orange-700/50 bg-orange-950/30 text-orange-300",
      NOCHE:  "border-indigo-700/50 bg-indigo-950/30 text-indigo-300",
    }[franja] ?? "border-slate-700 bg-slate-800 text-slate-300"
  );
}

function estadoTurno(estado: string): string {
  return (
    { PROGRAMADO: "Programado", EN_CURSO: "En curso", COMPLETADO: "Completado", AUSENTE: "Ausente", REEMPLAZADO: "Reemplazado" }[estado] ??
    estado
  );
}

function tipoOT(tipo: string): string {
  return (
    { INSTALACION: "Instalación", CORRECTIVO: "Correctivo", PREVENTIVO: "Preventivo", RETIRO: "Retiro" }[tipo] ??
    tipo
  );
}

function estadoLabel(estado: string): string {
  return (
    {
      SOLICITADA: "Solicitada", ASIGNADA: "Asignada",
      EN_RUTA: "En ruta",    EN_SITIO: "En sitio",
      PROGRAMADO: "Program.", EN_CURSO: "En curso",
      SIN_TURNO: "Sin turno", AUSENTE: "Ausente",
    }[estado] ?? estado
  );
}

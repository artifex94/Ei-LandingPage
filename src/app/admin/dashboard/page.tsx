import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { GraficoCobros } from "@/components/admin/GraficoCobros";
import { GraficoDonut } from "@/components/admin/GraficoDonut";

export const metadata: Metadata = { title: "Dashboard" };

const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function AdminDashboardPage() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  // ── Rangos de tiempo ─────────────────────────────────────────────────────────
  const inicioDia = new Date(hoy); inicioDia.setHours(0, 0, 0, 0);
  const finDia    = new Date(hoy); finDia.setHours(23, 59, 59, 999);

  const mesesGrafico: { mes: number; anio: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1);
    mesesGrafico.push({ mes: d.getMonth() + 1, anio: d.getFullYear(), label: MESES_CORTO[d.getMonth() + 1] });
  }

  // ── Todas las queries en paralelo ────────────────────────────────────────────
  const [
    totalActivas,
    suspendidas,
    enMantenimiento,
    bajaDefinitiva,
    solicitudesPendientes,
    cambiosPendientes,
    eventosSinProcesar,
    otsActivas,
    turnosHoy,
    pagosEsteMes,
    pagosRango,
    porCategoria,
    morosos,
  ] = await Promise.all([
    prisma.cuenta.count({ where: { estado: "ACTIVA" } }),
    prisma.cuenta.count({ where: { estado: "SUSPENDIDA_PAGO" } }),
    prisma.cuenta.count({ where: { estado: "EN_MANTENIMIENTO" } }),
    prisma.cuenta.count({ where: { estado: "BAJA_DEFINITIVA" } }),
    prisma.solicitudMantenimiento.count({ where: { estado: { not: "RESUELTA" } } }),
    prisma.solicitudCambioInfo.count({ where: { estado: "PENDIENTE" } }),
    prisma.eventoAlarma.count({ where: { estado: "NUEVO" } }),
    prisma.ordenTrabajo.count({ where: { estado: { in: ["SOLICITADA", "ASIGNADA", "EN_RUTA", "EN_SITIO"] } } }),
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
    prisma.pago.findMany({
      where: { OR: mesesGrafico.map((m) => ({ mes: m.mes, anio: m.anio })) },
      select: { mes: true, anio: true, importe: true, estado: true },
    }),
    prisma.cuenta.groupBy({
      by: ["categoria"],
      where: { estado: { not: "BAJA_DEFINITIVA" } },
      _count: { categoria: true },
    }),
    prisma.pago.groupBy({
      by: ["cuenta_id"],
      where: {
        OR: [
          { estado: "VENCIDO" },
          {
            estado: "PENDIENTE",
            OR: [{ anio: { lt: anio } }, { anio, mes: { lt: mes } }],
          },
        ],
      },
      _count: { cuenta_id: true },
      having: { cuenta_id: { _count: { gte: 2 } } },
    }),
  ]);

  // ── Derivados de pagosEsteMes ────────────────────────────────────────────────
  const cobradoEsteMes = pagosEsteMes
    .filter((p) => p.estado === "PAGADO")
    .reduce((s, p) => s + Number(p._sum.importe ?? 0), 0);

  const pendienteEsteMes = pagosEsteMes
    .filter((p) => p.estado === "PENDIENTE" || p.estado === "VENCIDO")
    .reduce((s, p) => s + Number(p._sum.importe ?? 0), 0);

  const countPagado = pagosEsteMes.find((p) => p.estado === "PAGADO")?._count.estado ?? 0;
  const countPendiente = pagosEsteMes.find((p) => p.estado === "PENDIENTE")?._count.estado ?? 0;
  const countVencido = pagosEsteMes.find((p) => p.estado === "VENCIDO")?._count.estado ?? 0;

  // ── Derivados de pagosRango ──────────────────────────────────────────────────
  const datosCobros = mesesGrafico.map(({ mes: m, anio: a, label }) => {
    const del = pagosRango.filter((p) => p.mes === m && p.anio === a);
    const cobrado = del.filter((p) => p.estado === "PAGADO").reduce((s, p) => s + Number(p.importe), 0);
    const pendiente = del.filter((p) => p.estado === "PENDIENTE" || p.estado === "VENCIDO").reduce((s, p) => s + Number(p.importe), 0);
    return { label, cobrado, pendiente };
  });

  // ── Gráfico: cuentas por estado ──────────────────────────────────────────────
  const datosEstado = [
    { nombre: "Activas",        valor: totalActivas,   color: "#22c55e" },
    { nombre: "Suspendidas",    valor: suspendidas,    color: "#f97316" },
    { nombre: "Mantenimiento",  valor: enMantenimiento, color: "#3b82f6" },
    { nombre: "Baja",           valor: bajaDefinitiva, color: "#475569" },
  ].filter((d) => d.valor > 0);

  // ── Gráfico: cuentas por categoría ──────────────────────────────────────────
  const coloresCategoria: Record<string, string> = {
    ALARMA_MONITOREO: "#f97316", CAMARA_CCTV: "#3b82f6",
    DOMOTICA: "#a855f7", ANTENA_STARLINK: "#06b6d4", OTRO: "#64748b",
  };
  const labelsCategoria: Record<string, string> = {
    ALARMA_MONITOREO: "Alarma", CAMARA_CCTV: "CCTV",
    DOMOTICA: "Domótica", ANTENA_STARLINK: "StarLink", OTRO: "Otro",
  };
  const datosCategoria = porCategoria.map((c) => ({
    nombre: labelsCategoria[c.categoria] ?? c.categoria,
    valor: c._count.categoria,
    color: coloresCategoria[c.categoria] ?? "#64748b",
  }));

  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* ── Alertas operacionales ────────────────────────────────────────────── */}
      {(eventosSinProcesar > 0 || otsActivas > 0 || turnosHoy.length === 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {eventosSinProcesar > 0 && (
            <Link
              href="/admin/eventos?estado=NUEVO"
              className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 hover:border-red-500/70 transition-colors"
            >
              <span className="text-red-400 text-xl flex-shrink-0" aria-hidden="true">⚡</span>
              <div>
                <p className="text-red-300 font-bold text-sm">
                  {eventosSinProcesar} evento{eventosSinProcesar !== 1 ? "s" : ""} sin procesar
                </p>
                <p className="text-red-400/60 text-xs">Ver eventos NUEVO →</p>
              </div>
            </Link>
          )}
          {otsActivas > 0 && (
            <Link
              href="/admin/ot"
              className="flex items-center gap-3 rounded-xl border border-blue-500/40 bg-blue-950/30 px-4 py-3 hover:border-blue-500/70 transition-colors"
            >
              <span className="text-blue-400 text-xl flex-shrink-0" aria-hidden="true">🔧</span>
              <div>
                <p className="text-blue-300 font-bold text-sm">
                  {otsActivas} OT{otsActivas !== 1 ? "s" : ""} en curso
                </p>
                <p className="text-blue-400/60 text-xs">Ver órdenes de trabajo →</p>
              </div>
            </Link>
          )}
          {turnosHoy.length === 0 && (
            <Link
              href="/admin/turnos"
              className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 hover:border-amber-500/70 transition-colors"
            >
              <span className="text-amber-400 text-xl flex-shrink-0" aria-hidden="true">⚠</span>
              <div>
                <p className="text-amber-300 font-bold text-sm">Sin turnos asignados hoy</p>
                <p className="text-amber-400/60 text-xs">Revisar cobertura →</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── Turno actual ─────────────────────────────────────────────────────── */}
      {turnosHoy.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Turnos de hoy
          </p>
          <div className="flex flex-wrap gap-2">
            {turnosHoy.map((t) => {
              const franjaLabel: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" };
              const franjaColor: Record<string, string> = { MANANA: "bg-yellow-900/40 text-yellow-300 border-yellow-700/40", TARDE: "bg-orange-900/40 text-orange-300 border-orange-700/40", NOCHE: "bg-indigo-900/40 text-indigo-300 border-indigo-700/40" };
              return (
                <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${franjaColor[t.franja] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
                  <span className="font-semibold">{franjaLabel[t.franja] ?? t.franja}</span>
                  <span className="opacity-70">·</span>
                  <span>{t.empleado.perfil.nombre}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Cuentas activas" valor={totalActivas} color="green" />
        <KpiCard label="Suspendidas" valor={suspendidas} color="orange" link="/admin/cuentas?estado=SUSPENDIDA_PAGO" />
        <KpiCard label="En mantenimiento" valor={enMantenimiento} color="blue" link="/admin/mantenimiento" />
        <KpiCard label="Solicitudes abiertas" valor={solicitudesPendientes} color="yellow" link="/admin/mantenimiento" />
        <KpiCard label="Cambios pendientes" valor={cambiosPendientes} color="purple" link="/admin/solicitudes-cambio" />
        <KpiCard label="Cuentas de baja" valor={bajaDefinitiva} color="slate" />
        <KpiCard
          label={`Cobrado ${MESES_CORTO[mes]}`}
          valor={cobradoEsteMes}
          formato="ars"
          color="green"
          sub={`${countPagado} pagos`}
        />
        <KpiCard
          label={`Pendiente ${MESES_CORTO[mes]}`}
          valor={pendienteEsteMes}
          formato="ars"
          color="amber"
          sub={`${countPendiente} pend · ${countVencido} venc`}
          link="/admin/pagos"
        />
      </div>

      {/* ── Alerta morosidad ────────────────────────────────────────────────── */}
      {morosos.length > 0 && (
        <a
          href="/admin/morosidad"
          className="flex items-center justify-between gap-4 bg-orange-950/40 border border-orange-700/50 rounded-xl px-5 py-4 hover:border-orange-600 transition-colors"
        >
          <div>
            <p className="text-orange-300 font-bold text-base">
              {morosos.length} {morosos.length === 1 ? "cuenta con morosidad" : "cuentas con morosidad"}
            </p>
            <p className="text-orange-400/70 text-sm mt-0.5">
              Cuentas con 2 o más meses vencidos sin regularizar
            </p>
          </div>
          <span className="text-orange-400 text-xl shrink-0" aria-hidden="true">→</span>
        </a>
      )}

      {/* ── Gráfico: cobros últimos 6 meses ─────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-4">
          Cobros — últimos 6 meses
        </p>
        <GraficoCobros datos={datosCobros} />
      </div>

      {/* ── Donuts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <GraficoDonut datos={datosEstado} titulo="Cuentas por estado" />
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <GraficoDonut datos={datosCategoria} titulo="Cuentas por categoría" />
        </div>
      </div>

      {/* ── Ratio de cobro del mes ───────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-3">
          Ratio de cobro — {MESES_CORTO[mes]} {anio}
        </p>
        <RatioBarra cobrado={countPagado} pendiente={countPendiente} vencido={countVencido} />
      </div>
    </section>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  valor,
  formato = "numero",
  color,
  sub,
  link,
}: {
  label: string;
  valor: number;
  formato?: "numero" | "ars";
  color: "green" | "orange" | "blue" | "yellow" | "purple" | "amber" | "slate";
  sub?: string;
  link?: string;
}) {
  const colores = {
    green:  "text-green-400 bg-green-900/30 border-green-800",
    orange: "text-orange-400 bg-orange-900/30 border-orange-800",
    blue:   "text-blue-400 bg-blue-900/30 border-blue-800",
    yellow: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
    purple: "text-purple-400 bg-purple-900/30 border-purple-800",
    amber:  "text-amber-400 bg-amber-900/30 border-amber-800",
    slate:  "text-slate-400 bg-slate-800 border-slate-700",
  };

  const valorStr =
    formato === "ars"
      ? valor >= 1_000_000
        ? `$${(valor / 1_000_000).toFixed(1)}M`
        : `$${(valor / 1_000).toFixed(0)}k`
      : String(valor);

  const cls = `rounded-xl border p-4 ${colores[color]} ${link ? "hover:opacity-80 transition-opacity cursor-pointer" : ""}`;

  const inner = (
    <>
      <p className="text-2xl font-bold">{valorStr}</p>
      <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </>
  );

  return link ? <a href={link} className={cls}>{inner}</a> : <div className={cls}>{inner}</div>;
}

// ── Barra de ratio ────────────────────────────────────────────────────────────
function RatioBarra({
  cobrado,
  pendiente,
  vencido,
}: {
  cobrado: number;
  pendiente: number;
  vencido: number;
}) {
  const total = cobrado + pendiente + vencido;
  if (total === 0) return <p className="text-slate-500 text-sm">Sin datos para este mes.</p>;

  const pctCobrado = Math.round((cobrado / total) * 100);
  const pctPendiente = Math.round((pendiente / total) * 100);
  const pctVencido = 100 - pctCobrado - pctPendiente;

  return (
    <div className="space-y-3">
      <div className="flex rounded-full overflow-hidden h-4">
        {pctCobrado > 0 && (
          <div style={{ width: `${pctCobrado}%` }} className="bg-green-500" />
        )}
        {pctPendiente > 0 && (
          <div style={{ width: `${pctPendiente}%` }} className="bg-amber-500" />
        )}
        {pctVencido > 0 && (
          <div style={{ width: `${pctVencido}%` }} className="bg-orange-600" />
        )}
      </div>
      <div className="flex gap-4 text-xs text-slate-400">
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />{cobrado} pagados ({pctCobrado}%)</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />{pendiente} pendientes ({pctPendiente}%)</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-orange-600 mr-1.5" />{vencido} vencidos ({pctVencido}%)</span>
      </div>
    </div>
  );
}

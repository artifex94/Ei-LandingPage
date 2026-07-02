import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import {
  calcularLiquidez,
  calcularAging,
  calcularTasaCobranza,
  type PagoParaLiquidez,
  type PagoImpagoParaAging,
  type MesTasaCobranza,
} from "@/lib/metricas-financieras";

export const metadata: Metadata = { title: "Tesorería" };

const MESES_ABREV = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Monto en pesos con separador de miles es-AR: 30000 → "$30.000" (mismo criterio que whatsapp-templates.ts). */
function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

/** (mes, anio) de los últimos 6 meses calendario incluyendo el actual, orden cronológico ascendente. */
function ultimosSeisMeses(mesActual: number, anioActual: number): { mes: number; anio: number }[] {
  const out: { mes: number; anio: number }[] = [];
  let m = mesActual;
  let y = anioActual;
  for (let i = 0; i < 6; i++) {
    out.unshift({ mes: m, anio: y });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

const AGING_CONFIG = [
  { key: "hasta30" as const, label: "0-30 días", bar: "bg-orange-300", swatch: "bg-orange-300 rounded-full" },
  { key: "de31a60" as const, label: "31-60 días", bar: "bg-orange-500", swatch: "bg-orange-500" },
  { key: "de61a90" as const, label: "61-90 días", bar: "bg-orange-700", swatch: "bg-orange-700 rotate-45" },
  { key: "mas90" as const, label: "+90 días", bar: "bg-orange-950 border border-orange-700", swatch: "bg-orange-950 border border-orange-500" },
];

export default async function TesoreriaPage() {
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();

  // Dos queries, selects mínimos, sin N+1 — cero data nueva, todo sobre `Pago`.
  const [pagosAnio, impagosHistoricos] = await Promise.all([
    prisma.pago.findMany({
      where: { anio: anioActual },
      select: { estado: true, importe: true, mes: true, anio: true, acreditado_en: true },
    }),
    prisma.pago.findMany({
      where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
      select: { mes: true, anio: true, importe: true },
    }),
  ]);

  const pagosParaLiquidez: PagoParaLiquidez[] = pagosAnio.map((p) => ({
    estado: p.estado,
    importe: Number(p.importe),
    mes: p.mes,
    anio: p.anio,
    acreditado_en: p.acreditado_en,
  }));

  const impagosParaAging: PagoImpagoParaAging[] = impagosHistoricos.map((p) => ({
    mes: p.mes,
    anio: p.anio,
    importe: Number(p.importe),
  }));

  const liquidez = calcularLiquidez(pagosParaLiquidez, ahora);
  const aging = calcularAging(impagosParaAging, ahora);

  // Nota: el pool de pagos es "año en curso" (ver query arriba), así que si el mes
  // actual es enero/febrero/marzo, los meses de este gráfico que caen en el año
  // anterior no van a tener datos (generado=0 → barra en 0%, no rompe nada).
  const gruposMeses: MesTasaCobranza[] = ultimosSeisMeses(mesActual, anioActual).map(({ mes, anio }) => ({
    mes,
    anio,
    pagos: pagosParaLiquidez.filter((p) => p.mes === mes && p.anio === anio),
  }));
  const tasaCobranza = calcularTasaCobranza(gruposMeses);

  const totalAging = AGING_CONFIG.reduce((s, c) => s + aging[c.key].monto, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Tesorería</h1>
        <p className="text-sm text-slate-400 mt-1">
          Liquidez, deuda vencida por antigüedad y tasa de cobranza — todo calculado sobre los
          pagos existentes, sin datos nuevos.
        </p>
      </div>

      {/* Cards de liquidez */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-900/30 border border-green-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-300">{pesos(liquidez.cobradoSemana)}</p>
          <p className="text-sm text-green-400 mt-1">Entró esta semana</p>
          <p className="text-xs text-slate-500 mt-1">Últimos 7 días, por fecha de acreditación.</p>
        </div>
        <div className="bg-green-900/30 border border-green-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-300">{pesos(liquidez.cobradoMes)}</p>
          <p className="text-sm text-green-400 mt-1">Entró este mes</p>
          <p className="text-xs text-slate-500 mt-1">Acreditado en {MESES_ABREV[mesActual]} {anioActual}.</p>
        </div>
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-300">{pesos(liquidez.pendienteMes)}</p>
          <p className="text-sm text-amber-400 mt-1">Pendiente del mes</p>
          <p className="text-xs text-slate-500 mt-1">Pendiente/vencido/procesando del período actual.</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{pesos(liquidez.proyeccionMes)}</p>
          <p className="text-sm text-slate-300 mt-1">Proyección del mes</p>
          <p className="text-xs text-slate-500 mt-1">
            Entrado + pendiente × tasa de cobranza del trimestre previo.
          </p>
        </div>
      </div>

      {/* Aging de la deuda */}
      <section aria-labelledby="aging-titulo" className="space-y-3">
        <div>
          <h2 id="aging-titulo" className="text-lg font-semibold text-white">
            Deuda vencida por antigüedad
          </h2>
          <p className="text-sm text-slate-400">
            {impagosParaAging.length > 0
              ? `${pesos(totalAging)} en ${impagosParaAging.length} pagos impagos.`
              : "No hay deuda impaga registrada."}
          </p>
        </div>

        {totalAging > 0 && (
          <div
            role="group"
            aria-label={`Deuda vencida por antigüedad: ${AGING_CONFIG.map(
              (c) => `${c.label}: ${pesos(aging[c.key].monto)} en ${aging[c.key].cantidad} pagos`
            ).join(". ")}`}
            className="flex h-8 w-full overflow-hidden rounded-lg border border-industrial-700"
          >
            {AGING_CONFIG.map((c) => {
              const bucket = aging[c.key];
              const pct = totalAging > 0 ? (bucket.monto / totalAging) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <Link
                  key={c.key}
                  href="/cobros"
                  aria-label={`${c.label}: ${pesos(bucket.monto)} en ${bucket.cantidad} pagos. Ir a morosidad.`}
                  title={`${c.label}: ${pesos(bucket.monto)} (${bucket.cantidad})`}
                  className={`${c.bar} h-full transition-opacity hover:opacity-80`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}

        {/* Leyenda con triple canal: color + texto + forma (swatch), cada bucket linkea a morosidad */}
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {AGING_CONFIG.map((c) => {
            const bucket = aging[c.key];
            return (
              <li key={c.key}>
                <Link
                  href="/cobros"
                  className="flex items-center gap-2 rounded-lg border border-industrial-700 bg-industrial-800/60 px-3 py-2 hover:border-orange-600 transition-colors"
                >
                  <span className={`inline-block w-3 h-3 shrink-0 ${c.swatch}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-xs text-slate-400">{c.label}</span>
                    <span className="block text-sm font-semibold text-white truncate">
                      {pesos(bucket.monto)}{" "}
                      <span className="text-xs font-normal text-slate-400">({bucket.cantidad})</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tasa de cobranza, últimos 6 meses */}
      <section aria-labelledby="tasa-titulo" className="space-y-3">
        <div>
          <h2 id="tasa-titulo" className="text-lg font-semibold text-white">
            Tasa de cobranza (últimos 6 meses)
          </h2>
          <p className="text-sm text-slate-400">% pagado sobre lo generado, mes a mes.</p>
        </div>

        <div className="flex items-end gap-3 h-40 bg-industrial-800/40 border border-industrial-700 rounded-xl p-4">
          {tasaCobranza.map((t) => (
            <div key={`${t.mes}-${t.anio}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-xs font-semibold text-white">{t.tasaPct}%</span>
              <div
                role="img"
                aria-label={`${MESES_ABREV[t.mes]} ${t.anio}: ${t.tasaPct}% de cobranza, ${pesos(t.pagado)} sobre ${pesos(t.generado)} generado`}
                className="w-full rounded-t-md bg-orange-500 min-h-[2px]"
                style={{ height: `${t.tasaPct > 0 ? Math.max(t.tasaPct, 4) : 0}%` }}
              />
              <span className="text-xs text-slate-400">{MESES_ABREV[t.mes]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

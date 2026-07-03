import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { proponerMatches, type PagoCandidato, type MovimientoConciliable } from "@/lib/conciliacion-bancaria";
import { ImportarExtractoForm } from "@/components/admin/ImportarExtractoForm";
import { ConciliacionMovimientosTable, type MovimientoRow } from "@/components/admin/ConciliacionMovimientosTable";

export const metadata: Metadata = { title: "Conciliación bancaria" };

export default async function ConciliacionBancariaPage() {
  // .catch(() => []) por si el SQL manual (movimientos_bancarios) todavía no
  // se aplicó en la DB — mismo patrón que candidatos_suspension en /cobros.
  const [movimientosSinConciliar, pagosPendientes] = await Promise.all([
    prisma.movimientoBancario
      .findMany({
        where: { conciliado_en: null },
        orderBy: { fecha: "desc" },
        take: 200,
      })
      .catch(() => []),
    prisma.pago
      .findMany({
        where: { estado: { in: ["PROCESANDO", "PENDIENTE"] } },
        include: { cuenta: { include: { perfil: { select: { nombre: true } } } } },
        take: 500,
      })
      .catch(() => []),
  ]);

  const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const pagoLabels = new Map<string, string>();
  const pagosCandidatos: PagoCandidato[] = pagosPendientes.map((p) => {
    pagoLabels.set(
      p.id,
      `${p.cuenta.perfil.nombre} — ${p.cuenta.descripcion} — $${Number(p.importe).toLocaleString("es-AR")} (${MESES[p.mes]}/${p.anio})`,
    );
    return {
      id: p.id,
      importe: Number(p.importe),
      ref_externa: p.ref_externa,
      updated_at: p.updated_at,
    };
  });

  const movimientosConciliables: MovimientoConciliable[] = movimientosSinConciliar.map((m) => ({
    id: m.id,
    fecha: m.fecha,
    importe: Number(m.importe),
    descripcion: m.descripcion,
  }));

  const propuestas = proponerMatches(movimientosConciliables, pagosCandidatos);
  const propuestaPorId = new Map(propuestas.map((p) => [p.movimiento_id, p]));

  const filas: MovimientoRow[] = movimientosSinConciliar.map((m) => {
    const propuesta = propuestaPorId.get(m.id);
    return {
      id: m.id,
      fechaLabel: new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" }),
      importe: Number(m.importe),
      descripcion: m.descripcion,
      clasificacion: propuesta?.clasificacion ?? "sin_match",
      pagoIdPropuesto: propuesta?.pago_id ?? null,
      candidatos: (propuesta?.candidatos ?? []).map((c) => ({
        pagoId: c.pago_id,
        label: pagoLabels.get(c.pago_id) ?? c.pago_id,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Conciliación bancaria</h1>
        <p className="text-sm text-slate-400 mt-1">
          Importá el extracto del homebanking y conciliá las transferencias avisadas sin buscarlas
          una por una.
        </p>
      </div>

      <ImportarExtractoForm />

      <ConciliacionMovimientosTable movimientos={filas} />
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit, registrarAuditTx } from "@/lib/audit";
import { requireCapacidad } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/constants/validation";
import { parsearExtractoCSV } from "@/lib/conciliacion-bancaria";

/**
 * Persistencia de la conciliación bancaria (Fase 6 del plan maestro). El
 * parseo y el matching son puros (`@/lib/conciliacion-bancaria`); acá solo
 * vive el I/O: importar el extracto (idempotente por hash) y aplicar la
 * conciliación que confirma el tesorero.
 */

// Límite de pares por lote — mismo criterio que MAX_PAGOS_BULK en portal/pagos/actions.ts.
const MAX_PARES_BULK = 200;

export interface ImportarExtractoResult {
  ok?: boolean;
  importados?: number;
  duplicados?: number;
  erroresParseo?: string[];
  error?: string;
}

/** Importa un extracto CSV pegado o subido. Idempotente: createMany + skipDuplicates por hash. */
export async function importarExtracto(texto: string): Promise<ImportarExtractoResult> {
  const admin = await requireCapacidad("puede_facturar");

  if (!texto || !texto.trim()) return { error: "El extracto está vacío." };

  const { movimientos, errores } = parsearExtractoCSV(texto);

  if (movimientos.length === 0) {
    return {
      error: errores.length > 0
        ? `No se pudo importar ninguna fila. ${errores[0]}`
        : "El extracto no tiene créditos para importar.",
      erroresParseo: errores,
    };
  }

  const { count } = await prisma.movimientoBancario.createMany({
    data: movimientos.map((m) => ({
      hash: m.hash,
      fecha: m.fecha,
      importe: m.importe,
      descripcion: m.descripcion,
      importado_por: admin.nombre,
    })),
    skipDuplicates: true,
  });

  const duplicados = movimientos.length - count;

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "EXTRACTO_BANCARIO_IMPORTADO",
    entidad: "movimiento_bancario",
    entidad_id: "batch",
    detalle: { importados: count, duplicados, erroresParseo: errores.length },
  });

  revalidatePath("/cobros/conciliacion");
  return { ok: true, importados: count, duplicados, erroresParseo: errores };
}

export interface ParConciliacion {
  movimiento_id: string;
  pago_id: string;
}

export interface ConciliarMovimientosResult {
  ok?: boolean;
  conciliados?: number;
  omitidos?: { movimiento_id: string; motivo: string }[];
  error?: string;
}

/**
 * Aplica la conciliación confirmada por el tesorero: por cada par
 * movimiento/pago, en una transacción propia, marca el Pago PAGADO y el
 * movimiento conciliado. Idempotente por par: si el pago ya está PAGADO o el
 * movimiento ya fue conciliado, se omite (no rompe el resto del lote).
 */
export async function conciliarMovimientos(pares: ParConciliacion[]): Promise<ConciliarMovimientosResult> {
  const admin = await requireCapacidad("puede_facturar");

  if (!pares || pares.length === 0) return { error: "No hay movimientos seleccionados." };
  if (pares.length > MAX_PARES_BULK) {
    return { error: `No se pueden conciliar más de ${MAX_PARES_BULK} movimientos a la vez.` };
  }
  if (pares.some((p) => !UUID_RE.test(p.movimiento_id) || !UUID_RE.test(p.pago_id))) {
    return { error: "IDs inválidos." };
  }

  let conciliados = 0;
  const omitidos: { movimiento_id: string; motivo: string }[] = [];

  for (const par of pares) {
    try {
      await prisma.$transaction(async (tx) => {
        const [movimiento, pago] = await Promise.all([
          tx.movimientoBancario.findUnique({ where: { id: par.movimiento_id } }),
          tx.pago.findUnique({ where: { id: par.pago_id } }),
        ]);

        if (!movimiento) {
          omitidos.push({ movimiento_id: par.movimiento_id, motivo: "Movimiento no encontrado." });
          return;
        }
        if (!pago) {
          omitidos.push({ movimiento_id: par.movimiento_id, motivo: "Pago no encontrado." });
          return;
        }
        if (movimiento.conciliado_en) {
          omitidos.push({ movimiento_id: par.movimiento_id, motivo: "El movimiento ya estaba conciliado." });
          return;
        }
        if (pago.estado === "PAGADO") {
          omitidos.push({ movimiento_id: par.movimiento_id, motivo: "El pago ya estaba acreditado." });
          return;
        }
        if (!movimiento.importe.equals(pago.importe)) {
          omitidos.push({
            movimiento_id: par.movimiento_id,
            motivo: `El importe no coincide (movimiento $${movimiento.importe.toFixed(2)} vs pago $${pago.importe.toFixed(2)}).`,
          });
          return;
        }

        const estadoPrevio = pago.estado;

        await tx.pago.update({
          where: { id: pago.id },
          data: {
            estado: "PAGADO",
            metodo: "TRANSFERENCIA_BANCARIA",
            acreditado_en: movimiento.fecha,
            registrado_por: admin.nombre,
          },
        });

        await tx.movimientoBancario.update({
          where: { id: movimiento.id },
          data: { pago_id: pago.id, conciliado_en: new Date() },
        });

        await registrarAuditTx(tx, {
          admin_id: admin.id,
          admin_nombre: admin.nombre,
          accion: "TRANSFERENCIA_CONCILIADA",
          entidad: "pago",
          entidad_id: pago.id,
          state_transition: { prior_state: estadoPrevio, new_state: "PAGADO" },
          detalle: {
            movimiento_id: movimiento.id,
            importe: Number(movimiento.importe),
            fecha_movimiento: movimiento.fecha,
          },
        });

        conciliados++;
      });
    } catch {
      omitidos.push({ movimiento_id: par.movimiento_id, motivo: "Error al conciliar." });
    }
  }

  revalidatePath("/cobros/conciliacion");
  revalidatePath("/cobros/pagos");
  revalidatePath("/admin/pagos");
  return { ok: true, conciliados, omitidos };
}

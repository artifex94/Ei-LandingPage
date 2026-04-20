"use server";

import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
// Datos fiscales del emisor — hardcodeados según facturas reales
const EMISOR = {
  cuit: "20385573503",
  razon_social: "ESCOBAR RAMIRO ANIBAL",
} as const;

// Tarifa estándar vigente si la cuenta no tiene override
async function getTarifaVigente() {
  const ultima = await prisma.tarifaHistorico.findFirst({
    orderBy: { vigente_desde: "desc" },
  });
  return ultima?.monto ?? 15000;
}

export interface ResultadoBorradores {
  creadas: number;
  omitidas: number;
  errores: { perfil_id: string; nombre: string; error: string }[];
}

/**
 * Genera borradores de Factura C para todos los titulares con cuentas activas.
 * Idempotente: si ya existe un borrador para el período, lo omite.
 * Se llama desde cron-mensual.ts el día 1 de cada mes.
 */
export async function prepararBorradoresFactura(
  periodo_desde: Date,
  periodo_hasta: Date,
  admin_id = "system"
): Promise<ResultadoBorradores> {
  const tarifaBase = await getTarifaVigente();

  // Solo perfiles marcados como requiere_factura con al menos una cuenta ACTIVA
  const perfiles = await prisma.perfil.findMany({
    where: {
      activo: true,
      requiere_factura: true,
      cuentas: {
        some: { estado: "ACTIVA" },
      },
    },
    include: {
      cuentas: {
        where: { estado: "ACTIVA" },
        select: { id: true, descripcion: true, costo_mensual: true, softguard_ref: true },
      },
    },
    orderBy: { nombre: "asc" },
  });

  const resultado: ResultadoBorradores = { creadas: 0, omitidas: 0, errores: [] };

  for (const perfil of perfiles) {
    try {
      // Idempotencia: omitir si ya existe borrador para este titular y período
      const existente = await prisma.factura.findFirst({
        where: {
          perfil_id: perfil.id,
          periodo_desde,
          estado: { in: ["BORRADOR", "EMITIDA_MANUAL", "EMITIDA_WSFE"] },
        },
      });

      if (existente) {
        resultado.omitidas++;
        continue;
      }

      // Armar ítems — uno por cuenta activa
      const items = perfil.cuentas.map((cuenta) => {
        const precio = cuenta.costo_mensual ?? tarifaBase;
        return {
          cuenta_id: cuenta.id,
          descripcion: "mantenimiento y servicio de alarma",
          cantidad: 1,
          precio_unit: precio,
          subtotal:    precio,
        };
      });

      const subtotal = items.reduce(
        (acc, it) => acc + Number(it.subtotal),
        0
      );

      // Fecha de vto: día 10 del mes que se factura
      const fecha_vto = new Date(periodo_desde);
      fecha_vto.setDate(10);

      await prisma.factura.create({
        data: {
          perfil_id:             perfil.id,
          tipo:                  "FACTURA_C",
          cuit_emisor:           EMISOR.cuit,
          razon_social_emisor:   EMISOR.razon_social,
          cuit_receptor:         perfil.cuit ?? null,
          razon_social_receptor: perfil.razon_social ?? perfil.nombre,
          condicion_iva_receptor: perfil.condicion_iva ?? "RESPONSABLE_INSCRIPTO",
          periodo_desde,
          periodo_hasta,
          fecha_vto_pago:        fecha_vto,
          subtotal,
          iva:                   0,
          total:                 subtotal,
          estado:                "BORRADOR",
          generada_por:          admin_id,
          items: { create: items },
        },
      });

      resultado.creadas++;
    } catch (err) {
      resultado.errores.push({
        perfil_id: perfil.id,
        nombre:    perfil.nombre,
        error:     err instanceof Error ? err.message : String(err),
      });
    }
  }

  await registrarAudit({
    admin_id,
    admin_nombre: admin_id === "system" ? "Cron prepararBorradores" : admin_id,
    accion: "FACTURAS_BORRADORES_GENERAR",
    entidad: "factura",
    entidad_id: "batch",
    detalle: {
      periodo: `${periodo_desde.toISOString().slice(0, 7)}`,
      creadas:  resultado.creadas,
      omitidas: resultado.omitidas,
      errores:  resultado.errores.length,
    },
  });

  return resultado;
}

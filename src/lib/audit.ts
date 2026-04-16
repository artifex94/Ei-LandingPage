import { prisma } from "@/lib/prisma/client";

export interface AuditParams {
  admin_id: string;
  admin_nombre: string;
  accion: string;       // "CUENTA_ACTUALIZADA" | "CLIENTE_EDITADO" | etc.
  entidad: string;      // "cuenta" | "cliente" | "pago" | "sensor"
  entidad_id: string;
  detalle?: Record<string, unknown>;
}

export async function registrarAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        admin_id: params.admin_id,
        admin_nombre: params.admin_nombre,
        accion: params.accion,
        entidad: params.entidad,
        entidad_id: params.entidad_id,
        detalle: params.detalle ? JSON.stringify(params.detalle) : undefined,
      },
    });
  } catch {
    // El audit log nunca debe romper la operación principal
  }
}

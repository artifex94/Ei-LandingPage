import { prisma } from "@/lib/prisma/client";
import { headers } from "next/headers";

// Cliente de transacción Prisma: el mismo `prisma` sin los métodos de
// nivel-conexión. Permite registrar el audit DENTRO de una $transaction.
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface AuditParams {
  admin_id: string;
  admin_nombre: string;
  accion: string;       // "CUENTA_ACTUALIZADA" | "OVERRIDE_SUSPENSION" | etc.
  entidad: string;      // "cuenta" | "cliente" | "pago" | "sensor"
  entidad_id: string;
  detalle?: Record<string, unknown>;
  // Campos enriquecidos — PDF PRD §3.3
  state_transition?: { prior_state: string | null; new_state: string };
  justification?: string;
}

/** Extrae la IP del request actual; null fuera de contexto de request (cron/scripts). */
export async function obtenerSourceIp(): Promise<string | null> {
  try {
    const hdrs = await headers();
    return (
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      null
    );
  } catch {
    return null;
  }
}

function construirAuditData(params: AuditParams, source_ip: string | null) {
  return {
    admin_id: params.admin_id,
    admin_nombre: params.admin_nombre,
    accion: params.accion,
    entidad: params.entidad,
    entidad_id: params.entidad_id,
    detalle: params.detalle ? JSON.stringify(params.detalle) : undefined,
    source_ip_address: source_ip,
    state_transition: params.state_transition
      ? JSON.stringify(params.state_transition)
      : undefined,
    justification: params.justification ?? undefined,
  };
}

/**
 * Best-effort: registra el audit con el cliente global y NUNCA rompe la
 * operación principal (traga errores). Uso general.
 */
export async function registrarAudit(params: AuditParams): Promise<void> {
  const source_ip = await obtenerSourceIp();
  try {
    await prisma.auditLog.create({ data: construirAuditData(params, source_ip) });
  } catch {
    // El audit log nunca debe romper la operación principal.
  }
}

/**
 * Transaccional: registra el audit con el client de la transacción y PROPAGA
 * errores, de modo que el audit y la operación principal sean atómicos (ambos
 * o ninguno). Usar cuando el rastro es crítico — p.ej. al borrar un pago,
 * donde perder el registro no es aceptable.
 */
export async function registrarAuditTx(
  tx: TxClient,
  params: AuditParams,
): Promise<void> {
  const source_ip = await obtenerSourceIp();
  await tx.auditLog.create({ data: construirAuditData(params, source_ip) });
}

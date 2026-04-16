import { prisma } from "@/lib/prisma/client";
import { headers } from "next/headers";

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

export async function registrarAudit(params: AuditParams): Promise<void> {
  // Extraer IP del request actual (disponible en Server Actions)
  let source_ip: string | null = null;
  try {
    const hdrs = await headers();
    source_ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      null;
  } catch {
    // headers() falla fuera de contexto de request (ej: scripts de cron)
  }

  try {
    await prisma.auditLog.create({
      data: {
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
      },
    });
  } catch {
    // El audit log nunca debe romper la operación principal
  }
}

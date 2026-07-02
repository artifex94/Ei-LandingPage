/**
 * GET /api/admin/cuenta-contexto?ref=ESI-0175
 *
 * Contexto del PORTAL para una cuenta de la central: cliente (nombre,
 * teléfono, email), proyección sg_* del panel, OTs abiertas y solicitudes de
 * mantenimiento abiertas. Es el diferenciador de la vista de operadores
 * frente a la suite de SoftGuard: el evento crudo + el negocio alrededor.
 *
 * Si la cuenta no tiene espejo en el portal (p. ej. líneas internas _SG),
 * responde { encontrada: false } — no es un error.
 *
 * Autenticación: ADMIN o empleado con capacidad `puede_monitorear` — mismo
 * criterio que /api/admin/patron-evento. Lo consume `MonitorOperadores`, que
 * también se monta en /monitoreo/en-vivo (gateado por `puede_monitorear`)
 * para operadores no-ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export interface CuentaContextoResponse {
  encontrada: boolean;
  cuenta?: {
    id: string;
    descripcion: string;
    categoria: string;
    estado: string;
    direccion: string | null;
    cliente: {
      nombre: string;
      telefono: string | null;
      email: string | null;
    };
    panel: {
      situacion: string | null;
      en_fallo_tst: boolean;
      fallo_tst_desde: string | null;
      ultimo_tst: string | null;
      en_fallo_ac: boolean;
      fallo_ac_desde: string | null;
      ultimo_evento: string | null;
      ultimo_evento_at: string | null;
      synced_at: string | null;
    };
    ots_abiertas: {
      id: string;
      numero: number;
      tipo: string;
      estado: string;
      descripcion: string;
      fecha_visita: string | null;
    }[];
    solicitudes_abiertas: {
      id: string;
      descripcion: string;
      estado: string;
      prioridad: string;
      creada_en: string;
    }[];
  };
}

export async function GET(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (sesion.perfil.rol !== "ADMIN") {
    const empleado = await prisma.empleado.findFirst({
      where: { perfil_id: sesion.userId },
      select: { puede_monitorear: true },
    });
    if (!empleado?.puede_monitorear) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const ref = (req.nextUrl.searchParams.get("ref") ?? "").trim();
  if (!ref) {
    return NextResponse.json({ error: "Falta ?ref" }, { status: 400 });
  }

  const cuenta = await prisma.cuenta.findUnique({
    where: { softguard_ref: ref },
    include: {
      perfil: { select: { nombre: true, telefono: true, email: true } },
      ordenes_trabajo: {
        where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          numero: true,
          tipo: true,
          estado: true,
          descripcion: true,
          fecha_visita: true,
        },
      },
      solicitudes: {
        where: { estado: { not: "RESUELTA" } },
        orderBy: { creada_en: "desc" },
        take: 5,
        select: {
          id: true,
          descripcion: true,
          estado: true,
          prioridad: true,
          creada_en: true,
        },
      },
    },
  });

  if (!cuenta) {
    return NextResponse.json({ encontrada: false } satisfies CuentaContextoResponse);
  }

  const direccion =
    [cuenta.calle, cuenta.localidad].filter(Boolean).join(", ") || null;

  return NextResponse.json({
    encontrada: true,
    cuenta: {
      id: cuenta.id,
      descripcion: cuenta.descripcion,
      categoria: cuenta.categoria,
      estado: cuenta.estado,
      direccion,
      cliente: {
        nombre: cuenta.perfil.nombre,
        telefono: cuenta.perfil.telefono,
        email: cuenta.perfil.email,
      },
      panel: {
        situacion: cuenta.sg_situacion,
        en_fallo_tst: cuenta.sg_en_fallo_tst,
        fallo_tst_desde: cuenta.sg_fallo_tst_desde?.toISOString() ?? null,
        ultimo_tst: cuenta.sg_ultimo_tst?.toISOString() ?? null,
        en_fallo_ac: cuenta.sg_en_fallo_ac,
        fallo_ac_desde: cuenta.sg_fallo_ac_desde?.toISOString() ?? null,
        ultimo_evento: cuenta.sg_ultimo_evento,
        ultimo_evento_at: cuenta.sg_ultimo_evento_at?.toISOString() ?? null,
        synced_at: cuenta.sg_synced_at?.toISOString() ?? null,
      },
      ots_abiertas: cuenta.ordenes_trabajo.map((ot) => ({
        id: ot.id,
        numero: ot.numero,
        tipo: ot.tipo,
        estado: ot.estado,
        descripcion: ot.descripcion,
        fecha_visita: ot.fecha_visita?.toISOString() ?? null,
      })),
      solicitudes_abiertas: cuenta.solicitudes.map((sm) => ({
        id: sm.id,
        descripcion: sm.descripcion,
        estado: sm.estado,
        prioridad: sm.prioridad,
        creada_en: sm.creada_en.toISOString(),
      })),
    },
  } satisfies CuentaContextoResponse);
}

"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { requireAdminWithName as requireAdmin } from "@/lib/actions/auth";

export async function actualizarTarifa(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Sin permisos." };

  const parsed = z.object({ monto: z.coerce.number().min(1) }).safeParse({
    monto: formData.get("monto"),
  });
  if (!parsed.success) return { error: "Monto inválido." };

  await prisma.tarifaHistorico.create({
    data: {
      monto:         parsed.data.monto,
      vigente_desde: new Date(),
      creado_por:    admin.id,
    },
  });

  await registrarAudit({
    admin_id: admin.id, admin_nombre: admin.nombre,
    accion: "ACTUALIZAR_TARIFA", entidad: "tarifa_historico", entidad_id: "global",
    detalle: { monto: parsed.data.monto },
  });
}

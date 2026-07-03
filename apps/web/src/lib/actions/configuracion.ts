"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { requireAdminWithName as requireAdmin } from "@/lib/actions/auth";
import { accionAdmin } from "@/lib/auth/guard";
import { CATALOGO_PARAMETROS, validarValorParametro } from "@/lib/parametros";

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

// ── Parámetros de negocio ───────────────────────────────────────────────────
// accionAdmin: se invoca programáticamente (await + se lee el retorno) desde
// ParametrosNegocioForm, así la autorización es estructural (fail-closed) y
// ctx.nombre queda disponible para auditoría sin repetir el preámbulo.
export const actualizarParametro = accionAdmin(
  async (ctx, formData: FormData): Promise<{ error?: string }> => {
    const clave = String(formData.get("clave") ?? "");
    const catalogo = CATALOGO_PARAMETROS.find((p) => p.clave === clave);
    if (!catalogo) return { error: "Parámetro desconocido." };

    const validado = validarValorParametro(String(formData.get("valor") ?? ""), catalogo.tipo, catalogo.min);
    if (!validado.ok) return { error: validado.error };

    const anterior = await prisma.parametroNegocio.findUnique({ where: { clave } });

    await prisma.parametroNegocio.upsert({
      where: { clave },
      create: {
        clave,
        valor:       validado.valor,
        tipo:        catalogo.tipo,
        categoria:   catalogo.categoria,
        descripcion: catalogo.descripcion,
        updated_por: ctx.nombre,
      },
      update: {
        valor:       validado.valor,
        updated_por: ctx.nombre,
      },
    });

    await registrarAudit({
      admin_id: ctx.id, admin_nombre: ctx.nombre,
      accion: "ACTUALIZAR_PARAMETRO", entidad: "parametro_negocio", entidad_id: clave,
      detalle: { valor: validado.valor },
      state_transition: {
        prior_state: anterior?.valor ?? `default:${catalogo.defaultValor}`,
        new_state: validado.valor,
      },
    });

    revalidatePath("/admin/configuracion");
    return {};
  },
);

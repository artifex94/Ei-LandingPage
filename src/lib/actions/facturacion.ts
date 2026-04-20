"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prepararBorradoresFactura } from "@/lib/facturacion/preparar-borradores";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  return perfil?.rol === "ADMIN" ? perfil : null;
}

// ── Generar borradores manualmente (sin esperar el cron) ──────────────────────

export async function generarBorradoresMes(anio: number, mes: number) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 0); // último día del mes

  const resultado = await prepararBorradoresFactura(desde, hasta, admin.id);
  revalidatePath("/admin/facturacion");
  return resultado;
}

// ── Actualizar datos fiscales del titular ─────────────────────────────────────

export async function actualizarDatosFiscales(
  perfil_id: string,
  datos: { cuit?: string; condicion_iva?: string; razon_social?: string }
) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  const perfil = await prisma.perfil.update({
    where: { id: perfil_id },
    data: {
      cuit:          datos.cuit         || undefined,
      razon_social:  datos.razon_social || undefined,
      condicion_iva: (datos.condicion_iva as never) || undefined,
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "PERFIL_DATOS_FISCALES",
    entidad: "perfil",
    entidad_id: perfil_id,
    detalle: datos,
  });

  revalidatePath("/admin/facturacion");
  return perfil;
}

// ── Marcar factura como emitida + subir PDF ───────────────────────────────────

export async function marcarEmitidaManual(
  factura_id: string,
  numero_oficial: string,
  pdf_file: FormData
) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  const file = pdf_file.get("pdf") as File | null;
  if (!file) throw new Error("Se requiere el PDF de la factura");

  // Subir a Supabase Storage (bucket: facturas)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const filename = `${numero_oficial.replace("-", "_")}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("facturas")
    .upload(filename, file, { contentType: "application/pdf", upsert: true });

  if (uploadError) throw new Error(`Error al subir PDF: ${uploadError.message}`);

  const { data: urlData } = supabaseAdmin.storage
    .from("facturas")
    .getPublicUrl(filename);

  const factura = await prisma.factura.update({
    where: { id: factura_id },
    data: {
      numero_oficial,
      estado:       "EMITIDA_MANUAL",
      fecha_emision: new Date(),
      pdf_url:      urlData.publicUrl,
      emitida_por:  admin.id,
    },
  });

  // Vincular pagos del período si los hay
  const pagosDelPeriodo = await prisma.pago.findMany({
    where: {
      cuenta: { perfil_id: factura.perfil_id },
      mes:    factura.periodo_desde.getMonth() + 1,
      anio:   factura.periodo_desde.getFullYear(),
      factura_id: null,
    },
  });

  if (pagosDelPeriodo.length > 0) {
    await prisma.pago.updateMany({
      where: { id: { in: pagosDelPeriodo.map((p) => p.id) } },
      data:  { factura_id },
    });
  }

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "FACTURA_EMITIR_MANUAL",
    entidad: "factura",
    entidad_id: factura_id,
    detalle: { numero_oficial, pdf_url: urlData.publicUrl, pagos_vinculados: pagosDelPeriodo.length },
    state_transition: { prior_state: "BORRADOR", new_state: "EMITIDA_MANUAL" },
  });

  revalidatePath("/admin/facturacion");
  return factura;
}

// ── Anular factura ────────────────────────────────────────────────────────────

export async function anularFactura(factura_id: string, motivo: string) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  const factura = await prisma.factura.update({
    where: { id: factura_id },
    data:  { estado: "ANULADA", arca_observaciones: motivo },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "FACTURA_ANULAR",
    entidad: "factura",
    entidad_id: factura_id,
    detalle: { motivo },
    state_transition: { prior_state: factura.estado, new_state: "ANULADA" },
    justification: motivo,
  });

  revalidatePath("/admin/facturacion");
  return factura;
}

// ── Editar importe de un ítem de borrador ─────────────────────────────────────

export async function editarItemFactura(
  item_id: string,
  precio_unit: number,
  descripcion?: string
) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  const item = await prisma.facturaItem.update({
    where: { id: item_id },
    data:  {
      precio_unit,
      subtotal: precio_unit,
      ...(descripcion ? { descripcion } : {}),
    },
  });

  // Recalcular totales de la factura padre
  const items = await prisma.facturaItem.findMany({ where: { factura_id: item.factura_id } });
  const nuevoSubtotal = items.reduce((acc, it) => acc + Number(it.subtotal), 0);

  await prisma.factura.update({
    where: { id: item.factura_id },
    data:  { subtotal: nuevoSubtotal, total: nuevoSubtotal },
  });

  revalidatePath("/admin/facturacion");
  return item;
}

// ── Activar / desactivar facturación para un titular ─────────────────────────

export async function toggleRequiereFactura(perfil_id: string, valor: boolean) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  await prisma.perfil.update({
    where: { id: perfil_id },
    data:  { requiere_factura: valor },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "PERFIL_TOGGLE_FACTURA",
    entidad: "perfil",
    entidad_id: perfil_id,
    detalle: { requiere_factura: valor },
  });

  revalidatePath("/admin/facturacion");
}

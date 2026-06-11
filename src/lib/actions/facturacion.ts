"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import type { CondicionIVA } from "@/generated/prisma/client";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prepararBorradoresFactura } from "@/lib/facturacion/preparar-borradores";
import { requireAdmin } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/constants/validation";

// ── Generar borradores manualmente (sin esperar el cron) ──────────────────────

export async function generarBorradoresMes(anio: number, mes: number) {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error("Mes inválido.");
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) throw new Error("Año inválido.");

  const admin = await requireAdmin();

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 0); // último día del mes

  const resultado = await prepararBorradoresFactura(desde, hasta, admin.id);
  revalidatePath("/admin/facturacion");
  return resultado;
}

const CONDICION_IVA_VALIDAS = new Set([
  "RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA", "EXENTO", "CONSUMIDOR_FINAL", "NO_RESPONSABLE",
]);

// ── Actualizar datos fiscales del titular ─────────────────────────────────────

export async function actualizarDatosFiscales(
  perfil_id: string,
  datos: { cuit?: string; condicion_iva?: string; razon_social?: string }
) {
  if (!UUID_RE.test(perfil_id)) throw new Error("ID de perfil inválido.");
  if (datos.condicion_iva && !CONDICION_IVA_VALIDAS.has(datos.condicion_iva)) {
    throw new Error("Condición de IVA inválida.");
  }
  if (datos.razon_social && datos.razon_social.length > 200) {
    throw new Error("La razón social no puede superar los 200 caracteres.");
  }

  const admin = await requireAdmin();

  const perfil = await prisma.perfil.update({
    where: { id: perfil_id },
    data: {
      cuit:          datos.cuit         || undefined,
      razon_social:  datos.razon_social || undefined,
      condicion_iva: (datos.condicion_iva as unknown as CondicionIVA) || undefined,
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
  if (!UUID_RE.test(factura_id)) throw new Error("ID de factura inválido.");
  if (!numero_oficial.trim()) throw new Error("El número oficial es obligatorio.");
  if (numero_oficial.length > 50) throw new Error("Número oficial demasiado largo.");

  const admin = await requireAdmin();

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

  if (uploadError) {
    console.error("[facturacion/subirPDF] Supabase storage error:", uploadError.message);
    throw new Error("Error al subir el PDF. Intentá de nuevo.");
  }

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
  if (!UUID_RE.test(factura_id)) throw new Error("ID de factura inválido.");
  const motivoTrimmed = motivo.trim();
  if (!motivoTrimmed) throw new Error("El motivo de anulación es obligatorio.");
  if (motivoTrimmed.length > 500) throw new Error("El motivo no puede superar los 500 caracteres.");

  const admin = await requireAdmin();

  const factura = await prisma.factura.update({
    where: { id: factura_id },
    data:  { estado: "ANULADA", arca_observaciones: motivoTrimmed },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "FACTURA_ANULAR",
    entidad: "factura",
    entidad_id: factura_id,
    detalle: { motivo: motivoTrimmed },
    state_transition: { prior_state: factura.estado, new_state: "ANULADA" },
    justification: motivoTrimmed,
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
  if (!UUID_RE.test(item_id)) throw new Error("ID de ítem inválido.");
  if (typeof precio_unit !== "number" || precio_unit < 0) {
    throw new Error("El precio debe ser un número positivo.");
  }
  if (descripcion && descripcion.length > 200) {
    throw new Error("La descripción no puede superar los 200 caracteres.");
  }

  await requireAdmin();

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
  if (!UUID_RE.test(perfil_id)) throw new Error("ID de perfil inválido.");
  const admin = await requireAdmin();

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

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

// ─── Mercado Pago ─────────────────────────────────────────────────────────────

export async function crearPreferenciaMercadoPago(
  cuentaId: string,
  mes: number,
  anio: number
): Promise<{ checkoutUrl: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pago = await prisma.pago.findUnique({
    where: { cuenta_id_mes_anio: { cuenta_id: cuentaId, mes, anio } },
    include: { cuenta: true },
  });

  if (!pago || pago.cuenta.perfil_id !== user.id) {
    return { error: "Pago no encontrado." };
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  });
  const preference = new Preference(client);

  const mesNombre = new Date(anio, mes - 1).toLocaleString("es-AR", {
    month: "long",
    year: "numeric",
  });

  let result;
  try {
    result = await preference.create({
      body: {
        items: [
          {
            id: pago.id,
            title: `Monitoreo ${mesNombre} — ${pago.cuenta.descripcion}`,
            quantity: 1,
            unit_price: Number(pago.importe),
            currency_id: "ARS",
          },
        ],
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        external_reference: pago.id,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=ok`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=error`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=pending`,
        },
      },
    });
  } catch (err) {
    console.error("[MP] Error al crear preferencia:", err);
    return { error: "No se pudo conectar con Mercado Pago. Intentá de nuevo." };
  }

  if (!result.init_point) return { error: "No se pudo crear la preferencia de pago." };

  return { checkoutUrl: result.init_point };
}

// ─── Talo Pay ─────────────────────────────────────────────────────────────────

export async function crearIntencionTalo(
  cuentaId: string,
  mes: number,
  anio: number
): Promise<{ paymentUrl: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pago = await prisma.pago.findUnique({
    where: { cuenta_id_mes_anio: { cuenta_id: cuentaId, mes, anio } },
    include: { cuenta: true },
  });

  if (!pago || pago.cuenta.perfil_id !== user.id) {
    return { error: "Pago no encontrado." };
  }

  // Si ya tiene una intención generada, reutilizarla
  if (pago.ref_externa && pago.estado === "PROCESANDO") {
    // Reconstruimos la URL de pago de Talo a partir del ID guardado
    return { paymentUrl: `https://talo.com.ar/payments/${pago.ref_externa}` };
  }

  const mesNombre = new Date(anio, mes - 1).toLocaleString("es-AR", {
    month: "long",
    year: "numeric",
  });

  let res: Response;
  try {
    res = await fetch("https://api.talo.com.ar/payments/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TALO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: process.env.TALO_USER_ID,
        price: { amount: Number(pago.importe), currency: "ARS" },
        description: `Monitoreo ${mesNombre} — Escobar Instalaciones`,
        external_id: pago.id,
        payment_methods: ["transfer"],
      }),
    });
  } catch (err) {
    console.error("[Talo] Error de red:", err);
    return { error: "No se pudo conectar con el servicio de pago. Intentá de nuevo." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[Talo] HTTP", res.status, body);
    return { error: `Error al generar el enlace de pago (${res.status}).` };
  }

  const json = await res.json();
  const taloData = json.data ?? json;
  const paymentUrl: string = taloData.payment_url;
  const taloId: string = String(taloData.id);

  if (!paymentUrl) {
    console.error("[Talo] Sin payment_url:", json);
    return { error: "Talo no devolvió un enlace de pago." };
  }

  await prisma.pago.update({
    where: { id: pago.id },
    data: {
      estado: "PROCESANDO",
      metodo: "TALO_CVU",
      ref_externa: taloId,
    },
  });

  return { paymentUrl };
}

// ─── Transferencia bancaria ────────────────────────────────────────────────

export async function avisarTransferencia(
  cuentaId: string,
  mes: number,
  anio: number
): Promise<{ ok: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pago = await prisma.pago.findUnique({
    where: { cuenta_id_mes_anio: { cuenta_id: cuentaId, mes, anio } },
    include: { cuenta: true },
  });

  if (!pago || pago.cuenta.perfil_id !== user.id) {
    return { error: "Pago no encontrado." };
  }

  // Código de referencia único derivado del ID del pago
  const refCode = `EI-${pago.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  await prisma.pago.update({
    where: { id: pago.id },
    data: {
      estado: "PROCESANDO",
      metodo: "TRANSFERENCIA_BANCARIA",
      ref_externa: refCode,
    },
  });

  revalidatePath("/portal/pagos");
  return { ok: true };
}

// ─── Pago total (todas las deudas juntas) ──────────────────────────────────

export async function crearPreferenciaTodoMP(
  pagoIds: string[]
): Promise<{ checkoutUrl: string } | { error: string }> {
  if (!pagoIds.length) return { error: "No hay pagos seleccionados." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pagos = await prisma.pago.findMany({
    where: { id: { in: pagoIds } },
    include: { cuenta: true },
  });

  // Verificar propiedad de todos los pagos
  if (pagos.some((p) => p.cuenta.perfil_id !== user.id)) {
    return { error: "No tenés permiso sobre alguno de estos pagos." };
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  });
  const preference = new Preference(client);

  const items = pagos.map((p) => {
    const mesNombre = new Date(p.anio, p.mes - 1).toLocaleString("es-AR", {
      month: "long",
      year: "numeric",
    });
    return {
      id: p.id,
      title: `Monitoreo ${mesNombre} — ${p.cuenta.descripcion}`,
      quantity: 1,
      unit_price: Number(p.importe),
      currency_id: "ARS",
    };
  });

  let result;
  try {
    result = await preference.create({
      body: {
        items,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        external_reference: pagoIds.join(","),
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=ok`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=error`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=pending`,
        },
      },
    });
  } catch (err) {
    console.error("[MP] Error al crear preferencia total:", err);
    return { error: "No se pudo conectar con Mercado Pago. Intentá de nuevo." };
  }

  if (!result.init_point) return { error: "No se pudo crear la preferencia de pago." };

  return { checkoutUrl: result.init_point };
}

export async function avisarTransferenciaTodo(
  pagoIds: string[]
): Promise<{ ok: boolean; refCodes: string[] } | { error: string }> {
  if (!pagoIds.length) return { error: "No hay pagos seleccionados." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pagos = await prisma.pago.findMany({
    where: { id: { in: pagoIds } },
    include: { cuenta: true },
  });

  if (pagos.some((p) => p.cuenta.perfil_id !== user.id)) {
    return { error: "No tenés permiso sobre alguno de estos pagos." };
  }

  const refCodes: string[] = [];
  for (const p of pagos) {
    const refCode = `EI-${p.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    refCodes.push(refCode);
    await prisma.pago.update({
      where: { id: p.id },
      data: {
        estado: "PROCESANDO",
        metodo: "TRANSFERENCIA_BANCARIA",
        ref_externa: refCode,
      },
    });
  }

  revalidatePath("/portal/pagos");
  return { ok: true, refCodes };
}

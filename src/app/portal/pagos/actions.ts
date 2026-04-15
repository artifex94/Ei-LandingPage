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

  const result = await preference.create({
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
      payment_methods: {
        default_payment_method_id: "wallet_purchase",
      },
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      external_reference: pago.id,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=ok`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=error`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/portal/pagos?status=pending`,
      },
    },
  });

  if (!result.init_point) return { error: "No se pudo crear la preferencia de pago." };

  return { checkoutUrl: result.init_point };
}

// ─── Talo Pay ─────────────────────────────────────────────────────────────────

export async function crearIntencionTalo(
  cuentaId: string,
  mes: number,
  anio: number
): Promise<{ cvu: string; alias: string; importe: string } | { error: string }> {
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

  const mesNombre = new Date(anio, mes - 1).toLocaleString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const res = await fetch("https://api.talo.com.ar/payments/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TALO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Number(pago.importe),
      currency: "ARS",
      description: `Monitoreo ${mesNombre} — Escobar Instalaciones`,
      external_id: pago.id,
      payment_methods: ["transfer"],
    }),
  });

  if (!res.ok) return { error: "Error al generar el CVU de pago." };

  const data = await res.json();

  // Actualizar estado a PROCESANDO y guardar referencia
  await prisma.pago.update({
    where: { id: pago.id },
    data: {
      estado: "PROCESANDO",
      metodo: "TALO_CVU",
      ref_externa: String(data.id),
    },
  });

  revalidatePath("/portal/pagos");

  return {
    cvu: data.cvu ?? data.cbu ?? "",
    alias: data.alias ?? "",
    importe: Number(pago.importe).toLocaleString("es-AR"),
  };
}

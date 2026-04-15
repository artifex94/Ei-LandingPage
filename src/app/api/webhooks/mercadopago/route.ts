import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";

function validarFirmaMP(body: string, xSignature: string, xRequestId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const parts = xSignature.split(",");
  const ts = parts.find((p) => p.startsWith("ts="))?.split("=")[1] ?? "";
  const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1] ?? "";

  const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig));
}

export async function POST(req: Request) {
  const body = await req.text();
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  if (!validarFirmaMP(body, xSignature, xRequestId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const evento = JSON.parse(body);
  if (evento.type !== "payment") return new Response("OK");

  const mpPaymentId = evento.data?.id;
  if (!mpPaymentId) return new Response("OK");

  const detRes = await fetch(
    `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
    { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
  );
  if (!detRes.ok) return new Response("Error fetching payment", { status: 500 });

  const detalle = await detRes.json();

  if (detalle.status === "approved") {
    // ref_externa UNIQUE → idempotente: si ya existe, updateMany no falla
    await prisma.pago.updateMany({
      where: { ref_externa: String(mpPaymentId) },
      data: {
        estado: "PAGADO",
        metodo: "MERCADOPAGO",
        acreditado_en: new Date(),
      },
    });

    revalidatePath("/portal/pagos");
    revalidatePath("/admin/pagos");
  }

  return new Response("OK");
}

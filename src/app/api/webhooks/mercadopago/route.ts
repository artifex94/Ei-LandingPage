import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";

// Máxima antigüedad aceptable de un webhook — 5 minutos.
// Previene replay attacks: un webhook capturado no puede ser
// reutilizado después de este período.
const MAX_TS_DRIFT_MS = 5 * 60 * 1000;

function validarFirmaMP(
  xRequestId: string,
  xSignature: string
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const parts = xSignature.split(",");
  const tsStr = parts.find((p) => p.startsWith("ts="))?.split("=")[1] ?? "";
  const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1] ?? "";

  // Validar que el timestamp es reciente (previene replay attacks)
  const ts = Number(tsStr);
  if (!ts || Date.now() - ts > MAX_TS_DRIFT_MS) return false;

  const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${tsStr};`;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // timingSafeEqual requiere buffers del mismo largo.
  // Si la firma recibida tiene largo diferente al hash esperado (64 chars hex),
  // se descarta directamente para evitar el RangeError.
  const hashBuf = Buffer.from(hash, "utf8");
  const sigBuf = Buffer.from(sig, "utf8");
  if (hashBuf.length !== sigBuf.length) return false;

  try {
    return crypto.timingSafeEqual(hashBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  if (!validarFirmaMP(xRequestId, xSignature)) {
    return new Response("Forbidden", { status: 403 });
  }

  let evento: { type?: string; data?: { id?: string } };
  try {
    evento = JSON.parse(body);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (evento.type !== "payment") return new Response("OK");

  const mpPaymentId = evento.data?.id;
  if (!mpPaymentId) return new Response("OK");

  // Validar que el ID solo contiene dígitos antes de interpolarlo en la URL.
  // Previene SSRF via path traversal (ej: "../../users") si el payload
  // estuviera manipulado (doble defensa — la firma HMAC ya lo bloquea).
  if (!/^\d+$/.test(String(mpPaymentId))) {
    return new Response("Bad Request", { status: 400 });
  }

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

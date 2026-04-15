import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";

function validarFirmaTalo(body: string, signature: string): boolean {
  const secret = process.env.TALO_WEBHOOK_SECRET;
  if (!secret) return false;

  const hash = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expected = `sha256=${hash}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-talo-signature") ?? "";

  if (!validarFirmaTalo(body, signature)) {
    return new Response("Forbidden", { status: 403 });
  }

  const evento = JSON.parse(body);

  if (evento.type === "payment.completed") {
    const externalId = evento.data?.external_id;
    if (externalId) {
      await prisma.pago.updateMany({
        where: { ref_externa: String(externalId) },
        data: {
          estado: "PAGADO",
          acreditado_en: new Date(),
        },
      });

      revalidatePath("/portal/pagos");
      revalidatePath("/admin/pagos");
    }
  }

  return new Response("OK");
}

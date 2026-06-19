import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { UUID_RE } from "@/lib/constants/validation";

function validarFirmaTalo(body: string, signature: string): boolean {
  const secret = process.env.TALO_WEBHOOK_SECRET;
  if (!secret) return false;

  const hash = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expected = `sha256=${hash}`;

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;

  try {
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
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

  let evento: { type?: string; data?: { external_id?: string } };
  try {
    evento = JSON.parse(body);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (evento.type === "payment.completed") {
    // `external_id` es el pago.id que enviamos a Talo al crear la intención
    // (crearIntencionTalo → external_id: pago.id). Es la clave de conciliación.
    // OJO: NO buscar por `ref_externa` — ahí guardamos el ID INTERNO de Talo
    // (para reconstruir la URL de pago), no el pago.id. La versión anterior
    // buscaba por ref_externa y NUNCA matcheaba → los pagos por Talo no se
    // conciliaban solos. Buscar por `id` (la PK) es lo correcto.
    const externalId = String(evento.data?.external_id ?? "");
    if (UUID_RE.test(externalId)) {
      const { count } = await prisma.pago.updateMany({
        where: { id: externalId, estado: { not: "PAGADO" } },
        data: {
          estado: "PAGADO",
          metodo: "TALO_CVU",
          acreditado_en: new Date(),
        },
      });

      if (count === 0) {
        // Ya pagado (idempotencia) o no existe. Loguear solo si no existe.
        const existe = await prisma.pago.count({ where: { id: externalId } });
        if (existe === 0) {
          console.error(
            "[conciliacion][talo] payment.completed sin pago local con ese id",
            { externalId }
          );
        }
      } else {
        revalidatePath("/portal/pagos");
        revalidatePath("/admin/pagos");
      }
    }
  }

  return new Response("OK");
}

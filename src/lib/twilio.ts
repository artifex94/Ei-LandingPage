/**
 * Utilidad compartida para enviar mensajes por WhatsApp via Twilio.
 * Usada por login/actions.ts y api/cron/route.ts.
 */
export async function enviarWhatsApp(to10Digits: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  const toWsp = `whatsapp:+549${to10Digits}`;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: toWsp, Body: body }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Twilio error:", err);
  }
  return res.ok;
}

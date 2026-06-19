/**
 * Envía un mensaje de texto libre por WhatsApp.
 * Solo funciona dentro de la ventana de 24hs de conversación activa.
 */
export async function enviarWhatsApp(to10Digits: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const countryPrefix = process.env.TWILIO_COUNTRY_PREFIX ?? "549";
  const toWsp = `whatsapp:+${countryPrefix}${to10Digits}`;

  const params: Record<string, string> = { To: toWsp, Body: body };
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (messagingServiceSid) {
    params.MessagingServiceSid = messagingServiceSid;
  } else {
    params.From = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Twilio error:", err);
  }
  return res.ok;
}

/**
 * Envía un template aprobado por Meta via Twilio Content API.
 * Funciona fuera de la ventana de 24hs — es el método correcto para notificaciones proactivas.
 *
 * variables: { "1": "valor1", "2": "valor2" } — deben coincidir con los {{n}} del template.
 */
export async function enviarWhatsAppTemplate(
  to10Digits: string,
  contentSid: string,
  variables: Record<string, string>
): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const countryPrefix = process.env.TWILIO_COUNTRY_PREFIX ?? "549";
  const toWsp = `whatsapp:+${countryPrefix}${to10Digits}`;

  const params: Record<string, string> = {
    To: toWsp,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  };
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (messagingServiceSid) {
    params.MessagingServiceSid = messagingServiceSid;
  } else {
    params.From = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Twilio template error:", err);
  }
  return res.ok;
}

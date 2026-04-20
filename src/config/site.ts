import { z } from "zod";

// Validamos que las variables de entorno existan y tengan el formato correcto
const envSchema = z.object({
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().min(10, "El número de WhatsApp es inválido o muy corto"),
});

const env = envSchema.safeParse({
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5493436575372",
});

if (!env.success) {
  console.error("❌ Error en variables de entorno:\n", env.error.format());
  throw new Error("Faltan variables de entorno requeridas para iniciar la aplicación.");
}

export const siteConfig = {
  name: "Escobar Instalaciones",
  title: "Escobar Instalaciones | Seguridad y Monitoreo 24hs — Victoria, Entre Ríos",
  description:
    "Empresa de seguridad en Victoria, Entre Ríos. Instalamos y monitoreamos alarmas, cámaras CCTV, domótica y control de acceso. Atención 24 hs, respuesta inmediata.",
  keywords: [
    "empresa de seguridad Victoria Entre Ríos",
    "alarmas Victoria Entre Ríos",
    "monitoreo 24 horas Victoria",
    "cámaras CCTV Entre Ríos",
    "domótica Victoria",
    "control de acceso Entre Ríos",
    "instalación alarmas Argentina",
    "seguridad hogar Victoria ER",
    "Escobar Instalaciones",
    "sistema de seguridad Entre Ríos",
  ].join(", "),
  url: "https://instalacionescob.ar",
  ogImage: "https://instalacionescob.ar/opengraph-image",
  contact: {
    phoneDisplay: "+54 9 343 657-5372",
    phoneE164: "+5493436575372",
    whatsappNumber: env.data.NEXT_PUBLIC_WHATSAPP_NUMBER,
    email: "admin@instalacionescob.ar",
    location: "Victoria, Entre Ríos, Argentina",
    latitude: -32.6267,
    longitude: -60.1553,
  },
  links: {
    // instagram: "https://instagram.com/escobarinstalaciones",
  },
};
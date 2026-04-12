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
  title: "Escobar Instalaciones | Seguridad y Monitoreo 24hs",
  description: "Sistemas de seguridad inteligente, alarmas, domótica y cámaras de última generación. Protegemos lo que más te importa en instalacionescob.ar",
  keywords: "seguridad, monitoreo, alarmas, domótica, control de acceso, Escobar Instalaciones, CCTV",
  url: "https://instalacionescob.ar", // URL real del proyecto
  contact: {
    phoneDisplay: "+54 9 34 3657-5372",
    whatsappNumber: env.data.NEXT_PUBLIC_WHATSAPP_NUMBER,
    email: "admin@instalacionescob.ar",
    location: "Victoria, Entre Ríos, Argentina",
  },
  links: {
    // Aquí podemos agregar redes sociales más adelante: instagram, facebook, etc.
  },
};
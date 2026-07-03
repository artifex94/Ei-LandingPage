import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import PortalSection from "@/components/sections/PortalSection";
import ServicesSection from "@/components/sections/ServicesSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import OpinionsSection from "@/components/sections/OpinionsSection";
import EmpezaSection from "@/components/sections/EmpezaSection";
import ContactSection from "@/components/sections/ContactSection";
import Footer from "@/components/layout/Footer";
import FloatingWhatsApp from "@/components/layout/FloatingWhatsApp";
import ScrollRevealFallback from "@/components/layout/ScrollRevealFallback";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": siteConfig.url,
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  telephone: siteConfig.contact.phoneE164,
  email: siteConfig.contact.email,
  image: siteConfig.ogImage,
  priceRange: "$$",
  currenciesAccepted: "ARS",
  paymentAccepted: "Efectivo, Transferencia bancaria, MercadoPago, Débito automático",
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.address.street,
    addressLocality: siteConfig.contact.locality,
    addressRegion: siteConfig.contact.region,
    addressCountry: siteConfig.contact.countryCode,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: siteConfig.contact.latitude,
    longitude: siteConfig.contact.longitude,
  },
  areaServed: [
    { "@type": "City", name: "Victoria" },
    { "@type": "State", name: "Entre Ríos" },
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servicios de seguridad",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Alarmas monitoreadas",
          description:
            "Sistemas anti-intrusión con sensores de movimiento, rotura de cristal, apertura, respaldo y aviso remoto.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Cámaras de Seguridad CCTV",
          description:
            "Circuitos cerrados de TV con grabación, visión nocturna, acceso remoto y ubicación profesional de cámaras.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Monitoreo 24 horas",
          description:
            "Central de monitoreo permanente con respuesta inmediata ante cualquier evento de seguridad.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Control de Acceso",
          description:
            "Gestión de accesos con biometría y tarjetas RFID para empresas, edificios y barrios cerrados.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Automatización segura",
          description:
            "Automatización útil para luces, portones y rutinas integradas con criterios de seguridad.",
        },
      },
    ],
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* overflow-x-clip (no hidden): hidden crea un scroll container y las
          view timelines de los reveals quedarían medidas contra él (congeladas). */}
      <div className="font-sans text-slate-800 bg-slate-900 min-h-screen overflow-x-clip selection:bg-orange-500 selection:text-white">
        <Navbar />
        <main>
          <HeroSection />
          <PortalSection />
          <ServicesSection />
          <FeaturesSection />
          <OpinionsSection />
          <EmpezaSection />
          <ContactSection />
          <Footer />
        </main>
        <FloatingWhatsApp />
        <ScrollRevealFallback />
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import ServicesSection from "@/components/sections/ServicesSection";
import PortalSection from "@/components/sections/PortalSection";
import ContactSection from "@/components/sections/ContactSection";
import Footer from "@/components/layout/Footer";
import FloatingWhatsApp from "@/components/layout/FloatingWhatsApp";
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
  paymentAccepted: "Efectivo, Transferencia bancaria, MercadoPago",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Victoria",
    addressRegion: "Entre Ríos",
    addressCountry: "AR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: siteConfig.contact.latitude,
    longitude: siteConfig.contact.longitude,
  },
  areaServed: {
    "@type": "State",
    name: "Entre Ríos",
  },
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
          name: "Alarmas Inteligentes",
          description: "Sistemas anti-intrusión con sensores de movimiento, rotura de cristal y apertura. Control desde smartphone.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Cámaras de Seguridad CCTV",
          description: "Circuitos cerrados de TV con grabación en la nube, visión nocturna y detección de personas con IA.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Monitoreo 24 horas",
          description: "Central de monitoreo permanente con respuesta inmediata ante cualquier evento de seguridad.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Control de Acceso",
          description: "Gestión de accesos con biometría y tarjetas RFID para empresas, edificios y barrios cerrados.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Domótica",
          description: "Automatización del hogar: luces, persianas y climatización controlados desde tu dispositivo.",
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
      <div className="font-sans text-slate-800 bg-slate-900 min-h-screen selection:bg-orange-500 selection:text-white">
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <ServicesSection />
        <PortalSection />
        <ContactSection />
        <Footer />
        <FloatingWhatsApp />
      </div>
    </>
  );
}

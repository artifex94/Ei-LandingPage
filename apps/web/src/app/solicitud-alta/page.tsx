import type { Metadata } from "next";
import { SolicitudAltaForm } from "@/components/SolicitudAltaForm";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Alta de usuario — Escobar Instalaciones",
  description: "Solicitá acceso a tu portal de cliente de Escobar Instalaciones.",
  robots: { index: false, follow: false },
};

export default function SolicitudAltaPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-lg mx-auto">
          <BrandLockup context="Solicitud de acceso" compact />
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-lg mx-auto w-full px-6 pt-8 pb-0 text-center">
        <h1 className="text-2xl font-bold text-white">
          Solicitá acceso a tu portal
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Completá el formulario y te enviamos el link de acceso por WhatsApp en
          cuanto procesemos tu solicitud.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto w-full">
        <SolicitudAltaForm />
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 px-6 py-6 text-center">
        <p className="text-xs text-slate-400">
          ¿Tenés dudas? Escribinos al{" "}
          <a
            href={siteConfig.contact.whatsappLink}
            className="text-orange-500 hover:text-orange-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {siteConfig.contact.phoneDisplay}
          </a>
        </p>
      </footer>
    </div>
  );
}

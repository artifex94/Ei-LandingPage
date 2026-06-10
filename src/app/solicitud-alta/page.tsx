import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SolicitudAltaForm } from "@/components/SolicitudAltaForm";

export const metadata: Metadata = {
  title: "Alta de usuario — Escobar Instalaciones",
  description: "Solicitá acceso a tu portal de cliente de Escobar Instalaciones.",
  robots: { index: false, follow: false },
};

export default function SolicitudAltaPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Escobar Instalaciones
            </p>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Victoria · Entre Ríos
            </p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-lg mx-auto w-full px-6 pt-10 pb-4 text-center">
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
            href="https://wa.me/5493436575372"
            className="text-orange-500 hover:text-orange-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            +54 9 3436 575372
          </a>
        </p>
      </footer>
    </div>
  );
}

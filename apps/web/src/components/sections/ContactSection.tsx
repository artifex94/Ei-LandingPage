import React from "react";
import { MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import WhatsAppForm from "@/components/forms/WhatsAppForm";
import { siteConfig } from "@/config/site";

const highlights = [
  { icon: Phone, label: "Atención directa", value: siteConfig.contact.phoneDisplay },
  { icon: MapPin, label: "Cobertura local", value: siteConfig.contact.location },
  { icon: Star, label: "Experiencia", value: "Más de 20 años en seguridad" },
];

export default function ContactSection() {
  return (
    <section id="contacto" aria-labelledby="contact-heading" className="relative overflow-hidden bg-slate-950 py-16 sm:py-20">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(34,197,94,0.12),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(241,119,32,0.16),transparent_30%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
          <div className="grid lg:grid-cols-[.92fr_1.08fr]">
            <div className="relative flex flex-col justify-center overflow-hidden bg-slate-950 p-6 text-white sm:p-8 lg:p-10">
              <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-orange-500/15 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300"><ShieldCheck className="h-5 w-5" /></div>
                <h2 id="contact-heading" className="text-balance text-3xl font-black tracking-tight md:text-4xl">Coordiná una evaluación</h2>
                <p className="mt-4 text-base leading-7 text-slate-400">Revisamos los puntos vulnerables y cómo usás el lugar, y te proponemos un sistema claro y fácil de mantener.</p>
                <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
                  {highlights.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-4 py-3.5">
                      <Icon className="h-5 w-5 text-orange-300" />
                      <div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="font-bold text-white">{value}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-6 sm:p-8 lg:p-10"><WhatsAppForm /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { BrandLockup } from "./BrandLockup";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-9 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_.8fr_.8fr]">
          <div>
            <BrandLockup context="Victoria · Entre Ríos" className="mb-4" />
            <p className="max-w-md text-sm leading-7">Soluciones de seguridad electrónica para familias y empresas: instalación profesional, monitoreo y soporte local.</p>
          </div>
          <div>
            <h3 className="mb-4 font-black text-white">Navegación</h3>
            <ul className="space-y-2 text-sm"><li><a href="#servicios" className="hover:text-orange-300">Servicios</a></li><li><a href="#nosotros" className="hover:text-orange-300">Nosotros</a></li><li><a href="#portal" className="hover:text-orange-300">Mi Central</a></li><li><a href="#contacto" className="hover:text-orange-300">Contacto</a></li></ul>
          </div>
          <div>
            <h3 className="mb-4 font-black text-white">Contacto</h3>
            <ul className="space-y-3 text-sm"><li className="flex gap-2"><Mail className="h-4 w-4 text-orange-300" /> {siteConfig.contact.email}</li><li className="flex gap-2"><Phone className="h-4 w-4 text-orange-300" /> {siteConfig.contact.phoneDisplay}</li><li className="flex gap-2"><MapPin className="h-4 w-4 text-orange-300" /> {siteConfig.contact.location}</li></ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs md:flex-row md:items-center md:justify-between"><p>&copy; {new Date().getFullYear()} Escobar Instalaciones. Todos los derechos reservados.</p><p>Seguridad, monitoreo y soporte en Victoria, Entre Ríos.</p></div>
      </div>
    </footer>
  );
}

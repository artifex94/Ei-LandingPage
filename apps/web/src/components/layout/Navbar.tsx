"use client";

import React, { useEffect, useState } from "react";
import { Menu, Phone, Shield, X } from "lucide-react";

const navLinks = [
  { name: "Inicio", href: "#inicio" },
  { name: "Servicios", href: "#servicios" },
  { name: "Nosotros", href: "#nosotros" },
  { name: "Mi Central", href: "#portal" },
  { name: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <nav aria-label="Navegación principal" className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || isMenuOpen ? "border-b border-white/10 bg-slate-950/88 py-2 shadow-2xl backdrop-blur-xl" : "bg-transparent py-4"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#inicio" className="group flex items-center gap-3" aria-label="Escobar Instalaciones - inicio">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20 transition group-hover:scale-105"><Shield className="h-5 w-5" /></span>
            <span className="flex flex-col"><span className="text-xl font-black leading-none tracking-tight text-white">ESCOBAR</span><span className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">Instalaciones</span></span>
          </a>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="relative text-sm font-semibold text-slate-300 transition hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-orange-400 after:transition-all hover:after:w-full">{link.name}</a>
            ))}
            <a href="#contacto" className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/25"><Phone className="h-4 w-4" /> Asesor</a>
          </div>

          <button type="button" onClick={() => setIsMenuOpen((open) => !open)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden" aria-expanded={isMenuOpen} aria-controls="mobile-menu" aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div id="mobile-menu" aria-hidden={!isMenuOpen} className={`overflow-hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 md:hidden ${isMenuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="space-y-2 px-4 py-5">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="block rounded-2xl px-4 py-3 text-base font-bold text-slate-200 transition hover:bg-white/5 hover:text-orange-300">{link.name}</a>
          ))}
          <a href="#contacto" onClick={() => setIsMenuOpen(false)} className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-4 font-black text-slate-950"><Phone className="h-4 w-4" /> Solicitar asesor</a>
        </div>
      </div>
    </nav>
  );
}

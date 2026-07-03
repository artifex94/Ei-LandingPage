"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { FileText, LogIn, Menu, X } from "lucide-react";
import { BrandLockup } from "./BrandLockup";
import HeaderCamera from "./HeaderCamera";

const navLinks = [
  { name: "Inicio", href: "#inicio" },
  { name: "Mi Central", href: "#portal" },
  { name: "Servicios", href: "#servicios" },
  { name: "Nosotros", href: "#nosotros" },
  { name: "Opiniones", href: "#opiniones" },
  { name: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState("#inicio");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
      const available = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = navLinks
      .map(({ href }) => document.querySelector<HTMLElement>(href))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveHref(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <nav
      aria-label="Navegación principal"
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || isMenuOpen ? "border-b border-white/10 bg-slate-950/88 py-2 shadow-2xl backdrop-blur-xl" : "bg-transparent py-4"}`}
    >
      <span
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-orange-400 transition-transform duration-100"
        style={{ transform: `scaleX(${progress / 100})` }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1600px] 2xl:px-12">
        <div className="flex h-16 items-center justify-between">
          <a
            href="#inicio"
            className="group flex items-center gap-3"
            aria-label="Escobar Instalaciones - inicio"
          >
            <BrandLockup context="Seguridad electrónica" />
          </a>

          <div className="hidden items-center gap-5 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                aria-current={activeHref === link.href ? "location" : undefined}
                className={`relative text-sm font-semibold transition after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:bg-orange-400 after:transition-all ${
                  activeHref === link.href
                    ? "text-white after:w-full"
                    : "text-slate-400 after:w-0 hover:text-white hover:after:w-full"
                }`}
              >
                {link.name}
              </a>
            ))}
            <div className="flex items-center gap-2 pl-1">
              <Link
                href="/portal/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-black text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-200/60 hover:bg-emerald-300/15"
              >
                <LogIn className="h-4 w-4" /> Entrar a Mi Central
              </Link>
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/25"
              >
                <FileText className="h-4 w-4" /> Presupuesto
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/portal/dashboard"
              className="inline-flex min-h-[40px] items-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 text-xs font-black text-emerald-100"
            >
              Mi Central
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        aria-hidden={!isMenuOpen}
        inert={isMenuOpen ? undefined : true}
        className={`overflow-hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 md:hidden ${isMenuOpen ? "max-h-[520px] opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
      >
        <div className="space-y-1 px-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              aria-current={activeHref === link.href ? "location" : undefined}
              onClick={() => setIsMenuOpen(false)}
              className={`block rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeHref === link.href
                  ? "bg-orange-500/10 text-orange-300"
                  : "text-slate-200 hover:bg-white/5 hover:text-orange-300"
              }`}
            >
              {link.name}
            </a>
          ))}
          <Link
            href="/portal/dashboard"
            onClick={() => setIsMenuOpen(false)}
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-4 font-black text-emerald-100"
          >
            <LogIn className="h-4 w-4" /> Entrar a Mi Central
          </Link>
          <a
            href="#contacto"
            onClick={() => setIsMenuOpen(false)}
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-4 font-black text-slate-950"
          >
            <FileText className="h-4 w-4" /> Solicitar presupuesto
          </a>
        </div>
      </div>

      <HeaderCamera />
    </nav>
  );
}

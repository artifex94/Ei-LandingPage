"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, Phone } from 'lucide-react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', href: '#inicio' },
    { name: 'Servicios', href: '#servicios' },
    { name: 'Nosotros', href: '#nosotros' },
    { name: 'Contacto', href: '#contacto' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="flex items-center justify-center h-10 w-10 bg-orange-500 rounded-lg text-white font-bold text-xl shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              EI
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white leading-none">ESCOBAR</span>
              <span className="text-[10px] text-orange-500 font-bold tracking-[0.2em] uppercase">Instalaciones</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-0.5 after:bg-orange-500 after:transition-all hover:after:w-full"
              >
                {link.name}
              </a>
            ))}

            {/* Mi Portal — botón destacado */}
            <a
              href="#portal"
              className="flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/50 hover:border-orange-500 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25"
            >
              <span aria-hidden="true">🔒</span>
              <span>Mi Portal</span>
            </a>

            <a
              href="#contacto"
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25 flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Asesor</span>
            </a>
          </div>

          {/* Mobile — botón hamburguesa */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mi Portal visible sin abrir menú */}
            <a
              href="#portal"
              className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/40 text-orange-400 px-3 py-1.5 rounded-full text-xs font-bold"
            >
              <span aria-hidden="true">🔒</span>
              <span>Mi Portal</span>
            </a>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu desplegable */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-slate-900 border-t border-slate-800 shadow-xl transition-all duration-300 ease-in-out overflow-hidden ${
          isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-5 space-y-3">

          {/* Mi Portal — tarjeta destacada arriba */}
          <a
            href="#portal"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 bg-orange-500/15 border border-orange-500/40 text-orange-400 font-bold px-4 py-4 rounded-xl transition-colors hover:bg-orange-500/25"
          >
            <span className="text-2xl" aria-hidden="true">🔒</span>
            <div>
              <p className="text-base leading-tight">Mi Portal</p>
              <p className="text-xs text-orange-400/70 font-normal mt-0.5">
                Zona exclusiva para clientes
              </p>
            </div>
          </a>

          <div className="border-t border-slate-800 pt-2 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block text-base font-medium text-slate-300 hover:text-orange-500 transition-colors py-2 px-1"
              >
                {link.name}
              </a>
            ))}
          </div>

          <a
            href="#contacto"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Solicitar Asesor Ahora
          </a>
        </div>
      </div>
    </nav>
  );
}

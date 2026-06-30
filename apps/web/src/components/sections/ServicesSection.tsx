"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  CheckCircle,
  ChevronRight,
  Home,
  Lock,
  Plus,
  Radio,
  X,
} from "lucide-react";

const services = [
  {
    title: "Alarmas monitoreadas",
    desc: "Protección anti-intrusión con sensores por zonas, respaldo energético y aviso inmediato.",
    image: "/images/services/hero-alarmas.webp",
    imageAlt: "Técnico de Escobar Instalaciones configurando sensores y panel de alarma",
    icon: Bell,
    features: ["App móvil", "Batería de respaldo", "Sirena y aviso remoto"],
  },
  {
    title: "Videovigilancia",
    desc: "Cámaras HD/4K, visión nocturna y acceso remoto con criterio de ubicación profesional.",
    image: "/images/services/hero-camaras.webp",
    imageAlt: "Instalación de cámaras de seguridad realizada por Escobar Instalaciones",
    icon: Camera,
    features: ["Grabación local/nube", "Acceso remoto", "Detección configurada"],
  },
  {
    title: "Control de acceso",
    desc: "Gestión de entradas para oficinas, edificios y espacios compartidos con trazabilidad.",
    image: "/images/services/hero-acceso.webp",
    imageAlt: "Sistema de control de acceso con credencial y equipo Escobar Instalaciones",
    icon: Lock,
    features: ["Usuarios por rol", "Registro horario", "RFID/biometría"],
  },
  {
    title: "Monitoreo 24 hs",
    desc: "Central permanente, alertas priorizadas y acompañamiento ante eventos críticos.",
    image: "/images/services/hero-monitoreo.webp",
    imageAlt: "Central de monitoreo 24 horas de Escobar Instalaciones",
    icon: Radio,
    features: ["Operación continua", "Protocolos claros", "Seguimiento de eventos"],
  },
  {
    title: "Automatización segura",
    desc: "Automatización útil: luces, escenas, portones y rutinas conectadas a seguridad.",
    image: "/images/services/hero-automatizacion.webp",
    imageAlt: "Automatización segura de portón y tablero instalada por Escobar Instalaciones",
    icon: Home,
    features: ["Escenas programadas", "Control remoto", "Integración gradual"],
  },
];

export default function ServicesSection() {
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  const open = active !== null ? services[active] : null;
  const OpenIcon = open?.icon;

  return (
    <section
      id="servicios"
      aria-labelledby="services-heading"
      className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20"
    >
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-orange-500/8 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15 mix-blend-screen"
        style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1600px] 2xl:px-12">
        <div className="reveal-on-scroll mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              Servicios
            </p>
            <h2
              id="services-heading"
              className="text-balance text-3xl font-black tracking-tight md:text-4xl"
            >
              Qué instalamos y monitoreamos
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-400 sm:text-lg">
              Cada servicio, instalado y mantenido por el mismo equipo.
              <span className="md:hidden"> Tocá cada uno para ver el detalle.</span>
            </p>
          </div>
          <a
            href="#contacto"
            className="group inline-flex items-center gap-2 font-bold text-orange-300 transition hover:text-orange-200"
          >
            Solicitar presupuesto{" "}
            <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </a>
        </div>

        {/* Desktop: grilla completa, todo a la vista */}
        <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3">
          {services.map(({ title, desc, image, imageAlt, icon: Icon, features }) => (
            <article
              key={title}
              className="reveal-on-scroll group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 transition duration-200 hover:border-orange-400/35 hover:bg-slate-900"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-orange-400/70 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="relative h-36 overflow-hidden border-b border-white/10">
                <Image
                  src={image}
                  alt={imageAlt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent" />
                <span className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/75 text-orange-300 ring-1 ring-white/15 backdrop-blur">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="relative p-5">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
                <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        {/* Mobile: botonera compacta que abre detalle en modal */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {services.map(({ title, image, icon: Icon }, index) => (
            <button
              key={title}
              type="button"
              onClick={() => setActive(index)}
              aria-haspopup="dialog"
              className="reveal-on-scroll group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 p-4 text-left transition duration-200 hover:border-orange-400/35 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <span className="pointer-events-none absolute inset-0 opacity-15">
                <Image src={image} alt="" fill sizes="100vw" className="object-cover" />
              </span>
              <span className="pointer-events-none absolute inset-0 bg-slate-950/70" />
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-orange-300 ring-1 ring-white/10">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-base font-bold">{title}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition group-hover:border-orange-300/40 group-hover:text-orange-200">
                <Plus className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {open && OpenIcon && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setActive(null)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="portal-page-enter relative w-full rounded-t-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setActive(null)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300 ring-1 ring-orange-300/20">
              <OpenIcon className="h-6 w-6" />
            </span>
            <h3 id="service-modal-title" className="mt-5 text-xl font-bold text-white">
              {open.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{open.desc}</p>

            <div className="relative mt-5 h-40 overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={open.image}
                alt={open.imageAlt}
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
            </div>

            <ul className="mt-5 space-y-2 border-t border-white/10 pt-5">
              {open.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href="#contacto"
              onClick={() => setActive(null)}
              className="group mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Solicitar presupuesto
              <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

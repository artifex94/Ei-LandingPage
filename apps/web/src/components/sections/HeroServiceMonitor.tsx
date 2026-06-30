"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Bell, Camera, Home, Lock, Radio, type LucideIcon } from "lucide-react";

type ServiceSlide = {
  title: string;
  description: string;
  src: string;
  icon: LucideIcon;
};

const services: ServiceSlide[] = [
  {
    title: "Alarmas monitoreadas",
    description: "Sensores, panel y aviso inmediato ante cualquier evento.",
    src: "/images/services/hero-alarmas.webp",
    icon: Bell,
  },
  {
    title: "Cámaras de seguridad",
    description: "Instalación CCTV, visión nocturna y acceso remoto.",
    src: "/images/services/hero-camaras.webp",
    icon: Camera,
  },
  {
    title: "Control de acceso",
    description: "Lectores, credenciales y trazabilidad para entradas seguras.",
    src: "/images/services/hero-acceso.webp",
    icon: Lock,
  },
  {
    title: "Monitoreo 24 hs",
    description: "Central atendida por personas, respuesta al instante.",
    src: "/images/services/hero-monitoreo.webp",
    icon: Radio,
  },
  {
    title: "Automatización segura",
    description: "Portones, luces y escenas conectadas a la seguridad.",
    src: "/images/services/hero-automatizacion.webp",
    icon: Home,
  },
];

const ROTATION_MS = 4800;

export default function HeroServiceMonitor() {
  const [active, setActive] = useState(0);
  const service = services[active] ?? services[0];
  const Icon = service.icon;

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % services.length);
    }, ROTATION_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Monitor / TV: bisel exterior */}
      <div className="relative rounded-[1.6rem] border border-white/10 bg-slate-950 p-2.5 shadow-2xl shadow-slate-950/60 ring-1 ring-black/50 sm:p-3">
        {/* Pantalla */}
        <figure className="image-reveal relative aspect-[16/9] overflow-hidden rounded-[1.05rem] bg-slate-900 ring-1 ring-white/10">
          <Image
            key={service.src}
            src={service.src}
            alt={`${service.title} de Escobar Instalaciones`}
            fill
            sizes="(max-width: 1024px) 90vw, 48vw"
            className="tv-channel object-cover"
          />

          {/* Velado inferior para legibilidad del OSD */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
          {/* Brillo de vidrio */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
          {/* Scanlines sutiles */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.7)_0px,rgba(255,255,255,0.7)_1px,transparent_1px,transparent_3px)]" />

          {/* Ráfaga de estática + barrido al cambiar de canal (re-disparados por key) */}
          <span
            key={`static-${active}`}
            aria-hidden="true"
            className="tv-static pointer-events-none absolute inset-0"
          />
          <span
            key={`scan-${active}`}
            aria-hidden="true"
            className="monitor-scan pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/30 to-transparent"
          />

          {/* Indicador en vivo */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
              En vivo
            </span>
          </div>

          {/* OSD inferior: servicio actual */}
          <figcaption className="absolute inset-x-0 bottom-0 p-5">
            <div className="flex items-end justify-between gap-4">
              <div key={active} className="monitor-osd flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0" aria-live="polite">
                  <span className="block truncate text-base font-black text-white">{service.title}</span>
                  <span className="block text-sm text-slate-300">{service.description}</span>
                </span>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex" aria-label="Servicios destacados">
                {services.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`Ver ${item.title}`}
                    aria-current={index === active ? "true" : undefined}
                    className={`h-2 rounded-full transition-all ${
                      index === active ? "w-8 bg-orange-400" : "w-2 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </figcaption>
        </figure>

        {/* LED de encendido en el bisel inferior */}
        <div className="mt-2 flex items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400/80 shadow-[0_0_8px_rgba(241,119,32,0.85)]" />
        </div>
      </div>

      {/* Pie / base del monitor */}
      <div className="mx-auto h-5 w-16 rounded-b-md bg-gradient-to-b from-slate-800 to-slate-900" />
      <div className="mx-auto h-2 w-44 max-w-[70%] rounded-full bg-slate-800/80 shadow-[0_10px_25px_rgba(2,6,23,0.6)]" />
    </div>
  );
}

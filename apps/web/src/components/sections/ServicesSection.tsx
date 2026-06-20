import React from "react";
import {
  Bell,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Home,
  Lock,
  Radio,
  Smartphone,
} from "lucide-react";

const services = [
  {
    title: "Alarmas monitoreadas",
    desc: "Protección anti-intrusión con sensores por zonas, respaldo energético y aviso inmediato.",
    icon: Bell,
    features: ["App móvil", "Batería de respaldo", "Sirena y aviso remoto"],
  },
  {
    title: "Videovigilancia",
    desc: "Cámaras HD/4K, visión nocturna y acceso remoto con criterio de ubicación profesional.",
    icon: Camera,
    features: ["Grabación local/nube", "Acceso remoto", "Detección configurada"],
  },
  {
    title: "Control de acceso",
    desc: "Gestión de entradas para oficinas, edificios y espacios compartidos con trazabilidad.",
    icon: Lock,
    features: ["Usuarios por rol", "Registro horario", "RFID/biometría"],
  },
  {
    title: "Monitoreo 24 hs",
    desc: "Central permanente, alertas priorizadas y acompañamiento ante eventos críticos.",
    icon: Radio,
    features: ["Operación continua", "Protocolos claros", "Seguimiento de eventos"],
  },
  {
    title: "Automatización segura",
    desc: "Automatización útil: luces, escenas, portones y rutinas conectadas a seguridad.",
    icon: Home,
    features: ["Escenas programadas", "Control remoto", "Integración gradual"],
  },
  {
    title: "Mi Central",
    desc: "Pagos, solicitudes y estado del servicio desde un portal de gestión simple para cada cliente.",
    icon: Smartphone,
    features: ["Pagos online", "Pedidos técnicos", "Estado del servicio"],
  },
];

export default function ServicesSection() {
  return (
    <section
      id="servicios"
      aria-labelledby="services-heading"
      className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20"
    >
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-orange-500/8 to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            </p>
          </div>
          <a
            href="#contacto"
            className="group inline-flex items-center gap-2 font-bold text-orange-300 transition hover:text-orange-200"
          >
            Pedir evaluación{" "}
            <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </a>
        </div>

        <div className="space-y-2 md:hidden">
          {services.map(({ title, desc, icon: Icon, features }, index) => (
            <details
              key={title}
              className="group rounded-xl border border-white/10 bg-slate-900/60 open:border-orange-400/30 open:bg-slate-900"
              open={index === 0}
            >
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-orange-300">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1 text-left text-sm font-bold text-white">{title}</span>
                <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-white/10 px-4 pb-4 pt-3">
                <p className="text-sm leading-6 text-slate-400">{desc}</p>
                <ul className="mt-3 grid gap-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>

        <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3">
          {services.map(({ title, desc, icon: Icon, features }) => (
            <article
              key={title}
              className="reveal-on-scroll group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 p-5 transition duration-200 hover:border-orange-400/35 hover:bg-slate-900"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-orange-400/70 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-orange-300 ring-1 ring-white/10">
                <Icon className="h-5 w-5" />
              </div>
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
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

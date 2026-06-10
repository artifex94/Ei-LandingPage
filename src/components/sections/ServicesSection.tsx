import React from "react";
import {
  Bell,
  Camera,
  CheckCircle,
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
    desc: "Pagos, solicitudes y estado del servicio desde una portal de gestión simple para cada cliente.",
    icon: Smartphone,
    features: ["Pagos online", "Pedidos técnicos", "Estado del servicio"],
  },
];

export default function ServicesSection() {
  return (
    <section
      id="servicios"
      aria-labelledby="services-heading"
      className="relative overflow-hidden bg-slate-950 py-24 text-white"
    >
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-orange-500/8 to-transparent" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              Servicios
            </p>
            <h2
              id="services-heading"
              className="text-balance text-3xl font-black tracking-tight md:text-5xl"
            >
              Un ecosistema completo, no piezas sueltas
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              Cada solución se piensa como parte de una operación: instalación, uso diario, alertas,
              soporte y mejora continua.
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

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map(({ title, desc, icon: Icon, features }) => (
            <article
              key={title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-7 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-orange-400/45 hover:shadow-orange-500/10"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-orange-400/70 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-orange-300 ring-1 ring-white/10 transition group-hover:bg-orange-500 group-hover:text-slate-950">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 min-h-[72px] text-sm leading-7 text-slate-400">{desc}</p>
              <ul className="mt-6 space-y-3 border-t border-white/10 pt-6">
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

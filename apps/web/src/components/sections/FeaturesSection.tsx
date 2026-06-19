import React from "react";
import { Activity, Eye, Headphones, ShieldCheck } from "lucide-react";

const capabilities = [
  {
    icon: Eye,
    title: "Visibilidad clara",
    desc: "Diseñamos zonas, cámaras y sensores para que el usuario entienda rápido qué está protegido y qué requiere atención.",
  },
  {
    icon: Activity,
    title: "Menos falsas alarmas",
    desc: "Calibración técnica, criterios de prioridad y mantenimiento preventivo para que cada alerta tenga contexto útil.",
  },
  {
    icon: Headphones,
    title: "Soporte cercano",
    desc: "Atención local, seguimiento por WhatsApp y Mi Central para pagos, pedidos y estado del servicio.",
  },
  {
    icon: ShieldCheck,
    title: "Instalación profesional",
    desc: "Cableado limpio, documentación de puntos críticos y equipos elegidos por confiabilidad, no por moda.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="nosotros" aria-labelledby="features-heading" className="relative overflow-hidden bg-slate-900 py-24">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(241,119,32,0.12),transparent_35%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-orange-400">Por qué elegirnos</p>
          <h2 id="features-heading" className="text-balance text-3xl font-black tracking-tight text-white md:text-5xl">Seguridad que se entiende, se usa y se mantiene</h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">
            La tecnología sola no protege. Protege un sistema bien diseñado, con señales claras, operación simple y mantenimiento serio.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {capabilities.map(({ icon: Icon, title, desc }, index) => (
            <article key={title} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:bg-white/[0.07]">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-orange-500/10 blur-2xl transition group-hover:bg-orange-500/20" />
              <div className="mb-8 flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-300 ring-1 ring-orange-400/20">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-mono text-xs text-slate-600">0{index + 1}</span>
              </div>
              <h3 className="text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

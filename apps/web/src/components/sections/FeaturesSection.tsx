import Image from "next/image";
import { Activity, Eye, Headphones, ShieldCheck } from "lucide-react";

const capabilities = [
  {
    icon: Eye,
    title: "Relevamiento claro",
    desc: "Definimos riesgos y prioridades antes de recomendar equipos.",
  },
  {
    icon: ShieldCheck,
    title: "Instalación prolija",
    desc: "Cableado, configuración y documentación pensados para durar.",
  },
  {
    icon: Activity,
    title: "Monitoreo humano",
    desc: "Cada alerta llega con contexto para responder mejor.",
  },
  {
    icon: Headphones,
    title: "Soporte local",
    desc: "Atención cercana cuando necesitás ajustar o resolver algo.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="nosotros"
      aria-labelledby="features-heading"
      className="relative overflow-hidden bg-slate-900 py-16 sm:py-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_12%,rgba(241,119,32,0.10),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll mb-9 max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-orange-400">
            Cómo trabajamos
          </p>
          <h2
            id="features-heading"
            className="text-balance text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            De la evaluación al soporte
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Evaluamos el riesgo, instalamos prolijo y monitoreamos las 24 horas.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.16fr_.84fr] lg:grid-rows-[auto_1fr]">
          <figure className="image-reveal group relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 lg:row-span-2 lg:min-h-[620px]">
            <Image
              src="/images/instalacion-panel.webp"
              alt="Técnico realizando una instalación ordenada en un panel de alarma"
              fill
              priority={false}
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/5 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                Instalación profesional
              </span>
              <p className="mt-2 max-w-lg text-xl font-bold text-white sm:text-2xl">
                Cableado ordenado y documentado, fácil de mantener.
              </p>
            </figcaption>
          </figure>

          <figure className="image-reveal group relative min-h-[250px] overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/images/monitoreo-local.webp"
              alt="Operadora atendiendo la central de monitoreo"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/15 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-lg font-bold text-white">Monitoreo atendido por personas.</p>
              <p className="mt-1 text-sm text-slate-300">Cada alerta la revisa un operador.</p>
            </figcaption>
          </figure>

          <div className="reveal-on-scroll grid overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 sm:grid-cols-2">
            {capabilities.map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="border-b border-white/10 p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0"
              >
                <Icon className="h-5 w-5 text-orange-300" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-400">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import type { CSSProperties } from "react";
import { Activity, Eye, Headphones, MapPin, ShieldCheck } from "lucide-react";
import StatCounter from "@/components/ui/StatCounter";
import { landingStats } from "@/config/landing";

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
      className="relative overflow-clip bg-slate-900 py-12 sm:py-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_12%,rgba(241,119,32,0.10),transparent_32%)]" />
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15 mix-blend-screen"
        style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1600px] 2xl:px-12">
        <div className="reveal-on-scroll mb-7 max-w-3xl sm:mb-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-orange-400">
            Cómo trabajamos
          </p>
          <h2
            id="features-heading"
            className="hud-title text-balance text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            De la evaluación al soporte
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:mt-4 sm:text-lg sm:leading-7">
            Evaluamos el riesgo, instalamos prolijo y monitoreamos las 24 horas.
          </p>
        </div>

        <dl className="mb-4 grid grid-cols-3 gap-3 sm:max-w-2xl">
          {landingStats.map((item, index) => (
            <div
              key={item.label}
              className="reveal-item rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center sm:text-left"
              style={{ "--i": index } as CSSProperties}
            >
              <dt className="text-2xl font-black text-white sm:text-3xl">
                {item.kind === "count" ? (
                  <StatCounter to={item.to} prefix={item.prefix} suffix={item.suffix} />
                ) : (
                  item.value
                )}
              </dt>
              <dd className="mt-1 text-xs leading-4 text-slate-400">{item.label}</dd>
            </div>
          ))}
        </dl>

        <p className="reveal-on-scroll mb-9 flex items-start gap-2 text-sm leading-6 text-slate-400">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" aria-hidden="true" />
          Cobertura en Victoria y alrededores: Rosario, zonas rurales y localidades aledañas.
        </p>

        <div className="grid gap-4 lg:grid-cols-[1.16fr_.84fr] lg:grid-rows-[auto_1fr]">
          <figure className="image-reveal group relative min-h-[230px] overflow-hidden rounded-2xl border border-white/10 sm:min-h-[320px] lg:row-span-2 lg:min-h-[620px]">
            <Image
              src="/images/instalacion-panel.webp"
              alt="Técnico realizando una instalación ordenada en un panel de alarma"
              fill
              unoptimized
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

          <figure className="image-reveal group relative min-h-[190px] overflow-hidden rounded-2xl border border-white/10 sm:min-h-[250px]">
            <Image
              src="/images/monitoreo-local.webp"
              alt="Operadora atendiendo la central de monitoreo"
              fill
              unoptimized
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/15 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-lg font-bold text-white">Monitoreo atendido por personas.</p>
              <p className="mt-1 text-sm text-slate-300">Cada alerta la revisa un operador.</p>
            </figcaption>
          </figure>

          <div className="grid overflow-clip rounded-2xl border border-white/10 bg-slate-950/35 sm:grid-cols-2">
            {capabilities.map(({ icon: Icon, title, desc }, index) => (
              <article
                key={title}
                className="reveal-item border-b border-white/10 p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0"
                style={{ "--i": index } as CSSProperties}
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

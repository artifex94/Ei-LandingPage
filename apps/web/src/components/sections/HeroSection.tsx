import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import HeroServiceMonitor from "./HeroServiceMonitor";

const stats = [
  { value: "26 años", label: "en el sector" },
  { value: "+100", label: "clientes y creciendo" },
  { value: "Respuesta", label: "inmediata ante el evento" },
];

export default function HeroSection() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-heading"
      className="relative flex items-center overflow-hidden bg-slate-950 pt-20 text-white lg:min-h-screen lg:pt-24"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#0f172a_54%,#111827_100%)]" />
        <div className="hero-lights absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(241,119,32,0.20),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(34,197,94,0.12),transparent_30%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
        />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute left-0 right-0 top-0 h-28 bg-gradient-to-b from-slate-950 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-8 2xl:max-w-[1600px] 2xl:gap-20 2xl:px-12">
        <div className="min-w-0 text-center lg:text-left">
          <div className="hero-enter mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200 sm:text-xs">
            <ShieldCheck className="h-4 w-4" />
            Seguridad electrónica · Victoria, Entre Ríos
          </div>

          <h1
            id="hero-heading"
            className="hero-enter hero-enter-delay-1 text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Siempre listos para cuidar
            <span className="holo-text block pb-2">
              lo que te importa
            </span>
          </h1>

          <p className="hero-enter hero-enter-delay-2 mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-slate-300 sm:text-lg lg:mx-0">
            Alarmas, cámaras y monitoreo 24 hs en Victoria y la zona.
          </p>

          <div className="hero-enter hero-enter-delay-3 mt-7 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5 lg:justify-start">
            <a
              href="#contacto"
              className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3 text-base font-bold text-slate-950 shadow-[0_12px_30px_rgba(241,119,32,0.2)] transition hover:-translate-y-0.5 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
            >
              Solicitar presupuesto
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              href="/portal/dashboard"
              className="group inline-flex flex-col text-sm leading-snug transition"
            >
              <span className="text-slate-400">¿Ya sos cliente?</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-200 underline-offset-4 group-hover:text-emerald-100 group-hover:underline">
                Entrá a Mi Central
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>

          <dl className="hero-enter hero-enter-delay-3 mx-auto mt-9 grid max-w-md grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-4 lg:mx-0">
            {stats.map((item) => (
              <div key={item.label} className="px-3 text-center sm:px-4 lg:text-left">
                <dd className="text-xl font-black text-white sm:text-2xl">{item.value}</dd>
                <dd className="mt-1 text-xs leading-4 text-slate-400">{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero-enter hero-enter-delay-2 relative mx-auto hidden w-full min-w-0 max-w-xl lg:block lg:max-w-none">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-orange-500/10 blur-3xl" />
          <HeroServiceMonitor />
        </div>
      </div>
    </section>
  );
}

import React from "react";
import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Lock,
  MessageCircle,
  ShieldCheck,
  Headset,
  Wrench,
} from "lucide-react";

const assurances = [
  { label: "Monitoreo", value: "24 hs", detail: "central activa todos los días" },
  { label: "Cobertura", value: "Local", detail: "Victoria y zona de influencia" },
  { label: "Servicio", value: "Integral", detail: "instalación, soporte y mantenimiento" },
];

const accountStatus = [
  { icon: ShieldCheck, label: "Sistema", value: "Armado", tone: "text-emerald-300" },
  { icon: Camera, label: "Cámaras", value: "Online", tone: "text-sky-300" },
  { icon: Bell, label: "Sensores", value: "Activos", tone: "text-orange-300" },
  { icon: Lock, label: "Accesos", value: "Seguro", tone: "text-slate-200" },
];

const quickActions = [
  { icon: Wrench, label: "Asistencia" },
  { icon: MessageCircle, label: "Avisar" },
  { icon: Headset, label: "Contacto" },
];

const activity = [
  { time: "Hoy", text: "Sistema verificado", state: "OK" },
  { time: "08:12", text: "Monitoreo activo", state: "24 hs" },
  { time: "Vie.", text: "Acompañamiento técnico solicitado", state: "Soporte" },
];

export default function HeroSection() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-heading"
      className="relative flex items-center overflow-hidden bg-slate-950 pt-24 text-white lg:min-h-screen"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(241,119,32,0.16),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(15,23,42,0.85),transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#111827_100%)]" />
        <div className="absolute inset-0 opacity-[0.055] bg-[linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-9 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-8">
        <div className="min-w-0 text-center lg:text-left">
          <div className="hero-enter mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200 sm:mb-7 sm:text-xs">
            <ShieldCheck className="h-4 w-4" />
            Seguridad electrónica profesional
          </div>

          <h1
            id="hero-heading"
            className="hero-enter hero-enter-delay-1 text-balance text-3xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Seguridad para tu casa
            <span className="block bg-gradient-to-r from-orange-300 via-orange-500 to-amber-200 bg-clip-text pb-2 text-transparent">
              o tu negocio
            </span>
          </h1>

          <p className="hero-enter hero-enter-delay-2 mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:mt-7 sm:text-lg sm:leading-8 lg:mx-0">
            Alarmas, cámaras, control de acceso y monitoreo las 24 horas en Victoria y la zona.
          </p>

          <div className="hero-enter hero-enter-delay-3 mt-7 flex flex-col justify-center gap-3 sm:mt-9 sm:flex-row lg:justify-start">
            <a
              href="#contacto"
              className="group inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3 text-base font-bold text-slate-950 shadow-[0_12px_30px_rgba(241,119,32,0.2)] transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
            >
              Solicitar evaluación{" "}
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#servicios"
              className="inline-flex w-full min-h-[52px] items-center justify-center rounded-xl border border-white/12 bg-white/5 px-7 py-3 text-base font-bold text-white transition hover:border-white/25 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
            >
              Ver soluciones
            </a>
          </div>

          <dl className="hero-enter hero-enter-delay-3 mt-7 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-3 sm:mt-9 sm:max-w-2xl lg:mx-0">
            {assurances.map((item) => (
              <div key={item.label} className="px-3 text-left sm:px-4">
                <dt className="text-[9px] uppercase tracking-[0.14em] text-slate-500 sm:text-xs">{item.label}</dt>
                <dd className="mt-1 text-base font-bold text-white sm:text-xl">{item.value}</dd>
                <dd className="mt-1 hidden text-xs leading-5 text-slate-400 sm:block">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero-enter hero-enter-delay-2 relative mx-auto w-full min-w-0 max-w-xl lg:max-w-none">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-orange-500/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/88 p-3 shadow-xl sm:p-4">
            <div className="rounded-xl border border-white/10 bg-slate-950">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-black text-white">Mi Central</p>
                    <p className="text-xs text-slate-500">Vista cliente · Hogar / comercio</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                  Online
                </span>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/8 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                        Estado actual
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">Protegido</h2>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-emerald-400 to-orange-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {accountStatus.map(({ icon: Icon, label, value, tone }) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <Icon className={`mb-2 h-4 w-4 ${tone}`} />
                      <p className="truncate text-[10px] uppercase tracking-[0.1em] text-slate-400 sm:text-xs">{label}</p>
                      <p className={`mt-1 truncate text-sm font-bold ${tone}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {quickActions.map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 text-xs font-bold text-white transition hover:border-orange-400/40 hover:bg-slate-800 sm:text-sm"
                    >
                      <Icon className="h-5 w-5 text-orange-300" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-black text-white">Actividad reciente</p>
                    <MessageCircle className="h-4 w-4 text-orange-300" />
                  </div>
                  <div className="space-y-2">
                    {activity.map((item) => (
                      <div
                        key={`${item.time}-${item.text}`}
                        className="flex items-center gap-2 border-t border-white/8 px-1 py-2 first:border-t-0"
                      >
                        <span className="w-10 text-xs font-bold text-slate-500">{item.time}</span>
                        <span className="flex-1 truncate text-sm text-slate-300">{item.text}</span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] font-black text-slate-300">
                          {item.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, FileText, Fingerprint, ShieldCheck, UserCheck } from "lucide-react";

export default function EmpezaSection() {
  return (
    <section
      id="empeza"
      aria-labelledby="empeza-heading"
      className="relative scroll-mt-24 overflow-clip bg-slate-900 py-16 sm:py-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(241,119,32,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.12),transparent_30%)]" />
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15 mix-blend-screen"
        style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1600px] 2xl:px-12">
        <div className="reveal-on-scroll mb-9 max-w-3xl">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-orange-400">Empezá</p>
          <h2
            id="empeza-heading"
            className="hud-title text-balance text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl"
          >
            ¿Por dónde arrancás?
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          {/* Nuevo */}
          <div
            className="reveal-item relative flex flex-col overflow-hidden rounded-2xl border border-orange-400/25 bg-slate-950/60 p-6 sm:p-8"
            style={{ "--i": 0 } as CSSProperties}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-left opacity-[0.10] mix-blend-screen"
              style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
            />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300 ring-1 ring-orange-300/20">
              <FileText className="h-6 w-6" />
            </span>
            <h3 className="relative mt-5 text-xl font-bold text-white">Soy nuevo</h3>
            <p className="relative mt-2 flex-1 text-sm leading-6 text-slate-400">
              Contanos qué querés proteger y te armamos un presupuesto.
            </p>
            <a
              href="#contacto"
              className="group mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-orange-500 px-5 py-3 text-base font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950 sm:px-7"
            >
              Solicitar presupuesto
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </a>
          </div>

          {/* Cliente existente */}
          <div
            className="reveal-item relative flex flex-col overflow-hidden rounded-2xl border border-emerald-300/25 bg-slate-950/60 p-6 sm:p-8"
            style={{ "--i": 1 } as CSSProperties}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-[0.10] mix-blend-screen"
              style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
            />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300 ring-1 ring-emerald-300/20">
              <UserCheck className="h-6 w-6" />
            </span>
            <h3 className="relative mt-5 text-xl font-bold text-white">Ya soy cliente</h3>
            <p className="relative mt-2 flex-1 text-sm leading-6 text-slate-400">
              Creá tu acceso a Mi Central. Te identificamos por DNI o CUIT/CUIL y vinculamos
              automáticamente tus cuentas.
            </p>
            <div className="relative mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Fingerprint className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Alta rápida con tu documento
            </div>
            <Link
              href="/solicitud-alta"
              className="group mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-300 px-5 py-3 text-base font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 sm:px-7"
            >
              Crear mi acceso
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <p className="mt-4 text-sm text-slate-400">
              ¿Ya tenés acceso?{" "}
              <Link
                href="/portal/dashboard"
                className="inline-flex items-center gap-1 font-semibold text-emerald-300 underline-offset-4 hover:underline"
              >
                Entrá a Mi Central
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  Fingerprint,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import StatCounter from "@/components/ui/StatCounter";
import { landingStats } from "@/config/landing";

// Embudo de conversión: el camino que genera negocio (lead nuevo →
// presupuesto) domina la jerarquía; el acceso de clientes existentes queda
// visible pero secundario.

const pasos = [
  { icon: MessageSquareText, label: "Contanos qué proteger" },
  { icon: ClipboardCheck, label: "Lo evaluamos con vos" },
  { icon: FileText, label: "Recibís tu presupuesto" },
];

const statsConfianza = landingStats.filter((item) => item.kind === "count");

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
          <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-lg sm:leading-7">
            Tres pasos y tu lugar queda protegido. Sin vueltas.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] lg:gap-5">
          {/* Lead nuevo — camino dominante */}
          <div
            className="reveal-item relative flex flex-col overflow-clip rounded-2xl border border-orange-400/30 bg-slate-950/60 p-6 sm:p-8"
            style={{ "--i": 0 } as CSSProperties}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-left opacity-[0.10] mix-blend-screen"
              style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
            />
            <div className="relative flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300 ring-1 ring-orange-300/20">
                <FileText className="h-6 w-6" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Nuevo cliente
              </p>
            </div>

            <h3 className="relative mt-5 text-balance text-xl font-black text-white sm:text-2xl">
              Pedí tu presupuesto sin cargo
            </h3>
            <p className="relative mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Contanos qué querés proteger — tu casa, tu comercio o tu campo — y lo
              revisamos con vos antes de recomendarte nada.
            </p>

            <ol className="relative mt-5 grid gap-2 sm:grid-cols-3">
              {pasos.map(({ icon: Icon, label }, index) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-black text-orange-300 ring-1 ring-orange-300/20">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-orange-300" aria-hidden="true" />
                  <span className="text-xs font-semibold leading-4 text-slate-300">{label}</span>
                </li>
              ))}
            </ol>

            <div className="relative mt-6 flex flex-1 flex-col justify-end">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#contacto"
                  className="group inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-orange-500 px-5 py-3 text-base font-bold text-slate-950 shadow-[0_12px_30px_rgba(241,119,32,0.2)] transition hover:-translate-y-0.5 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950 sm:px-7"
                >
                  Pedir presupuesto
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </a>
                <p className="text-xs leading-5 text-slate-400">
                  Sin compromiso · Victoria y alrededores
                </p>
              </div>

              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4">
                {statsConfianza.map((item) => (
                  <div key={item.label} className="flex items-baseline gap-1.5">
                    <dd className="text-base font-black text-white">
                      <StatCounter to={item.to} prefix={item.prefix} suffix={item.suffix} />
                    </dd>
                    <dd className="text-xs text-slate-400">{item.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Cliente existente — camino secundario, visible pero compacto */}
          <div
            className="reveal-item relative flex flex-col overflow-clip rounded-2xl border border-emerald-300/25 bg-slate-950/60 p-6 sm:p-8"
            style={{ "--i": 1 } as CSSProperties}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-[0.10] mix-blend-screen"
              style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
            />
            <div className="relative flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300 ring-1 ring-emerald-300/20">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Ya soy cliente
              </p>
            </div>

            <h3 className="relative mt-5 text-xl font-bold text-white">Tu cuenta, en Mi Central</h3>
            <p className="relative mt-2 flex-1 text-sm leading-6 text-slate-400">
              Pagos, soporte y estado del servicio en un solo lugar. Te identificamos por
              DNI o CUIT/CUIL y vinculamos tus cuentas.
            </p>
            <div className="relative mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Fingerprint className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Alta rápida con tu documento
            </div>
            <Link
              href="/solicitud-alta"
              className="group relative mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-300 px-5 py-3 text-base font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 sm:px-7"
            >
              Crear mi acceso
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <p className="relative mt-4 text-sm text-slate-400">
              ¿Ya tenés acceso?{" "}
              <Link
                href="/portal/dashboard"
                className="inline-flex items-center gap-1 font-semibold text-emerald-300 underline-offset-4 hover:underline"
              >
                Entrá a Mi Central
                <ArrowRight className="h-4 w-4" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

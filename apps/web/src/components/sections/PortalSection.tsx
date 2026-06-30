import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  Headset,
  LayoutDashboard,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";
import { siteConfig } from "@/config/site";

const portalFeatures = [
  { icon: CreditCard, text: "Pagos mensuales, vencimientos y recibos en un solo lugar" },
  { icon: ShieldCheck, text: "Estado de servicio, sensores y cuentas vinculadas" },
  { icon: Wrench, text: "Solicitudes técnicas sin llamadas innecesarias" },
  { icon: FileText, text: "Documentación e historial centralizados" },
];

const portalActions = [
  {
    icon: LayoutDashboard,
    title: "Panel principal",
    text: "Resumen de cuenta, estado y próximos pasos.",
    href: "/portal/dashboard",
  },
  {
    icon: CreditCard,
    title: "Pagos",
    text: "Vencimientos, medios de pago y comprobantes.",
    href: "/portal/pagos",
  },
  {
    icon: FileText,
    title: "Documentos",
    text: "Recibos, datos útiles y material del servicio.",
    href: "/portal/documentos",
  },
  {
    icon: Headset,
    title: "Soporte",
    text: "Pedí asistencia y seguí tus solicitudes.",
    href: "/portal/soporte",
  },
];

export default function PortalSection() {
  return (
    <section
      id="portal"
      aria-labelledby="portal-heading"
      className="relative scroll-mt-24 overflow-hidden bg-slate-950 py-12 text-white sm:py-20"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,197,94,0.12),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(241,119,32,0.15),transparent_34%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen"
          style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll mb-7 flex flex-col gap-5 sm:mb-9 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2
              id="portal-heading"
              className="text-balance text-2xl font-black tracking-tight sm:text-3xl md:text-4xl lg:text-5xl"
            >
              <span className="holo-text">Mi Central</span> siempre visible desde el inicio.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400 sm:mt-4 sm:text-lg sm:leading-7">
              Quien ya confía en Escobar Instalaciones entra directo a sus pagos, soporte,
              documentos y estado del servicio, con acceso rápido, contexto claro y menos pasos.
            </p>
          </div>
          <Link
            href="/portal/dashboard"
            className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-300 px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Acceder ahora
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="reveal-on-scroll grid grid-cols-2 gap-2 sm:gap-3">
            {portalActions.map(({ icon: Icon, title, text, href }) => (
              <Link
                key={title}
                href={href}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-slate-900 sm:p-5"
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-screen"
                  style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
                />
                <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-orange-400 to-emerald-300 transition duration-300 group-hover:scale-x-100" />
                <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5 sm:gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300 ring-1 ring-orange-300/15 sm:h-11 sm:w-11">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-orange-200" />
                </div>
                <h3 className="text-sm font-black text-white sm:text-lg">{title}</h3>
                <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">{text}</p>
              </Link>
            ))}
          </div>

          <div className="reveal-on-scroll relative rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-3 shadow-xl shadow-slate-950/35 backdrop-blur">
            <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-900 p-5">
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.10] mix-blend-screen"
                style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
              />
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-orange-500/12 blur-3xl" />
              <div className="relative mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-slate-950">
                    <User className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-black text-white">Mi Central EI</p>
                    <p className="text-xs text-slate-400">Acceso exclusivo para clientes</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  Online
                </span>
              </div>

              <div className="relative rounded-2xl border border-emerald-300/15 bg-emerald-300/8 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                    Próxima acción
                  </p>
                  <CalendarCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <p className="text-xl font-black text-white sm:text-2xl">Vencimiento visible</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  El cliente sabe qué hacer, dónde pagar y cómo pedir ayuda.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {portalFeatures.map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-start gap-3 border-b border-white/10 px-1 py-3 last:border-b-0"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />
                    <span className="text-sm leading-6 text-slate-300">{text}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/portal/dashboard"
                className="group mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Entrar a Mi Central{" "}
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
              <p className="mt-4 text-center text-sm text-slate-400">
                ¿Primera vez?{" "}
                <a
                  href={siteConfig.contact.whatsappLink}
                  className="font-semibold text-orange-300 underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pedí tus datos por WhatsApp
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="reveal-on-scroll mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/55 p-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <span>Nuevo cliente: pedí evaluación. Cliente actual: entrá directo y resolvé.</span>
          </div>
          <a href="#contacto" className="font-black text-orange-300 hover:text-orange-200">
            Quiero asesoramiento
          </a>
        </div>
      </div>
    </section>
  );
}

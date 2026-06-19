import Link from "next/link";
import { ArrowRight, CreditCard, FileText, ShieldCheck, User, Wrench } from "lucide-react";
import { siteConfig } from "@/config/site";

const features = [
  { icon: CreditCard, text: "Pagos mensuales con Mercado Pago o transferencia" },
  { icon: ShieldCheck, text: "Estado de dispositivos, sensores y cuentas" },
  { icon: Wrench, text: "Solicitudes técnicas sin llamadas innecesarias" },
  { icon: FileText, text: "Historial y recibos centralizados" },
];

export default function PortalSection() {
  return (
    <section id="portal" aria-labelledby="portal-heading" className="relative scroll-mt-24 overflow-hidden bg-slate-900 py-24">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(241,119,32,0.14),transparent_36%)]" />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-orange-400">Mi Central</p>
          <h2 id="portal-heading" className="text-balance text-3xl font-black tracking-tight text-white md:text-5xl">Autogestión simple para que el servicio no dependa de perseguir mensajes</h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">Mi Central funciona como una central de monitoreo miniatura: pagos, asistencia y estado operativo en un solo lugar. Eso también es performance, pero del negocio.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />
                <span className="text-sm leading-6 text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl backdrop-blur">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-slate-950"><User className="h-5 w-5" /></span><div><p className="font-black text-white">Mi Central EI</p><p className="text-xs text-slate-500">Acceso exclusivo clientes</p></div></div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Online</span>
            </div>
            <div className="space-y-3">
              {['Cuenta al día', '2 sensores activos', 'Próximo vencimiento visible'].map((item) => (
                <div key={item} className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-slate-300">{item}</div>
              ))}
            </div>
            <Link href="/portal/dashboard" className="group mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-lg font-black text-slate-950 transition hover:-translate-y-1 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950">
              Acceder a Mi Central <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <p className="mt-4 text-center text-sm text-slate-400">¿Primera vez? <a href={siteConfig.contact.whatsappLink} className="font-semibold text-orange-300 underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">Pedí tus datos por WhatsApp</a></p>
          </div>
        </div>
      </div>
    </section>
  );
}

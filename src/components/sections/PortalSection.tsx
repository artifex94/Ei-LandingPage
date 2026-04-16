import Link from "next/link";
import { User, CreditCard, Wrench, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: <CreditCard className="w-5 h-5 text-orange-400" />,
    text: "Pagá tu servicio mensual con Mercado Pago o transferencia",
  },
  {
    icon: <User className="w-5 h-5 text-orange-400" />,
    text: "Consultá el estado de tus dispositivos y sensores en tiempo real",
  },
  {
    icon: <Wrench className="w-5 h-5 text-orange-400" />,
    text: "Solicitá asistencia técnica directo desde el portal",
  },
];

export default function PortalSection() {
  return (
    <section
      id="portal"
      className="py-24 bg-slate-900 relative overflow-hidden"
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-orange-500 font-bold tracking-wide uppercase text-sm mb-2">
            Clientes Escobar Instalaciones
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Administrá tu servicio desde cualquier lugar
          </h2>
          <p className="text-slate-400 text-lg">
            Con tu cuenta de cliente podés gestionar pagos, revisar el estado de
            tus instalaciones y pedir asistencia sin llamar.
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-xl mx-auto shadow-2xl">
          <ul className="space-y-4 mb-8">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 p-2 bg-orange-500/10 rounded-lg">
                  {f.icon}
                </span>
                <span className="text-slate-300 text-sm leading-relaxed">
                  {f.text}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/portal/dashboard"
            className="flex items-center justify-center gap-2 w-full bg-orange-700 hover:bg-orange-800 text-white font-bold rounded-xl px-6 py-4 text-lg transition-all transform hover:-translate-y-0.5 shadow-lg shadow-orange-500/25"
          >
            Acceder a Mi Portal
            <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-center text-sm text-slate-400 mt-4">
            ¿Primera vez?{" "}
            <a
              href="https://wa.me/5493436575372"
              className="text-orange-400 hover:text-orange-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pedí tus datos de acceso por WhatsApp
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

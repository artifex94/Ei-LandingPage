import Link from "next/link";
import { UserPlus, CreditCard, Upload, Wrench, Users } from "lucide-react";

const ACCIONES = [
  {
    href: "/admin/clientes/nuevo",
    label: "+ Nuevo cliente",
    icon: UserPlus,
    cls: "border-orange-700/40 bg-orange-950/30 text-orange-300 hover:border-orange-600/60 hover:bg-orange-950/50",
  },
  {
    href: "/admin/pagos",
    label: "Registrar pago",
    icon: CreditCard,
    cls: "border-emerald-700/40 bg-emerald-950/30 text-emerald-300 hover:border-emerald-600/60 hover:bg-emerald-950/50",
  },
  {
    href: "/admin/importar",
    label: "Importar SoftGuard",
    icon: Upload,
    cls: "border-blue-700/40 bg-blue-950/30 text-blue-300 hover:border-blue-600/60 hover:bg-blue-950/50",
  },
  {
    href: "/admin/mantenimiento",
    label: "Ver mantenimiento",
    icon: Wrench,
    cls: "border-amber-700/40 bg-amber-950/30 text-amber-300 hover:border-amber-600/60 hover:bg-amber-950/50",
  },
  {
    href: "/admin/clientes",
    label: "Todos los clientes",
    icon: Users,
    cls: "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700",
  },
] as const;

export function AccionesRapidas() {
  return (
    <section aria-label="Acciones rápidas del día">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
        ¿Qué hacés hoy?
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ACCIONES.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center gap-2.5 rounded-xl border px-3 py-4 min-h-[84px] text-center font-medium text-sm transition-colors ${a.cls}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span className="leading-tight">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

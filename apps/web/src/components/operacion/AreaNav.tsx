"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, MonitorPlay, AlertTriangle, CreditCard, ArrowLeftRight } from "lucide-react";

/**
 * Navegación de áreas operativas enfocadas (Monitoreo, Cobros).
 *
 * Reutilizable entre áreas: cada layout le pasa sus propios items. Replica el
 * patrón de TecnicoTabNav (tabs sticky en desktop, bottom-nav fija en mobile)
 * para mantener una experiencia consistente entre los paneles internos.
 *
 * El ícono se pasa por NOMBRE (string), no como componente: los layouts son
 * Server Components y no pueden cruzar referencias de componentes por props
 * hacia este Client Component. Para sumar un ícono nuevo, registralo en ICONS.
 */
const ICONS = { ListChecks, MonitorPlay, AlertTriangle, CreditCard, ArrowLeftRight } as const;

export type AreaNavIcon = keyof typeof ICONS;

export type AreaNavItem = {
  href: string;
  label: string;
  icon: AreaNavIcon;
};

function esActivo(pathname: string, href: string): boolean {
  // El home del área (href sin segmentos extra) sólo matchea exacto;
  // las subrutas matchean por prefijo.
  const segmentos = href.split("/").filter(Boolean);
  if (segmentos.length <= 1) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AreaNav({
  items,
  mobile = false,
}: {
  items: AreaNavItem[];
  mobile?: boolean;
}) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav
        aria-label="Navegación del área"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-industrial-800 border-t border-industrial-700 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex">
          {items.map((item) => {
            const activo = esActivo(pathname, item.href);
            const Icon = ICONS[item.icon];
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    activo
                      ? "text-tactical-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegación del área"
      className="hidden lg:block bg-industrial-800 border-b border-industrial-700"
    >
      <ul className="max-w-7xl mx-auto w-full px-4 lg:px-8 flex gap-1">
        {items.map((item) => {
          const activo = esActivo(pathname, item.href);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activo
                    ? "border-tactical-500 text-tactical-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

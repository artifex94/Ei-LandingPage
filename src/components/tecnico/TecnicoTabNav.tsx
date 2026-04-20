"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, House, CalendarRange, ClipboardList } from "lucide-react";

const TABS = [
  {
    href:       "/tecnico/dashboard",
    label:      "Dashboard",
    mobileLabel:"Dashboard",
    icon:       LayoutDashboard,
    color:      "text-slate-200",
    bg:         "bg-slate-500/15",
    bar:        "bg-slate-300",
    alsoActive: [],
  },
  {
    href:       "/tecnico/mi-dia",
    label:      "Mi día",
    mobileLabel:"Inicio",
    icon:       House,
    color:      "text-amber-400",
    bg:         "bg-amber-500/15",
    bar:        "bg-amber-400",
    alsoActive: [],
  },
  {
    href:       "/tecnico/mi-semana",
    label:      "Mi semana",
    icon:       CalendarRange,
    color:      "text-indigo-400",
    bg:         "bg-indigo-500/15",
    bar:        "bg-indigo-400",
    alsoActive: [],
  },
  {
    href:       "/tecnico/ots",
    label:      "OTs",
    icon:       ClipboardList,
    color:      "text-sky-400",
    bg:         "bg-sky-500/15",
    bar:        "bg-sky-400",
    alsoActive: ["/tecnico/ot", "/tecnico/tareas"],
  },
] as const;

function isActive(pathname: string, tab: (typeof TABS)[number]): boolean {
  return (
    pathname === tab.href ||
    pathname.startsWith(tab.href + "/") ||
    tab.alsoActive.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

interface Props { mobile?: boolean }

export function TecnicoTabNav({ mobile = false }: Props) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav
        aria-label="Secciones técnico"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 px-4 py-1 flex gap-1"
        style={{ paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom))" }}
      >
        {TABS.map((tab) => {
          const active = isActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 rounded-xl transition-colors ${
                active ? `${tab.bg} ${tab.color}` : "text-slate-500"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                {"mobileLabel" in tab ? tab.mobileLabel : tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Desktop: tab bar debajo del header
  return (
    <div className="hidden lg:block sticky top-[57px] z-30 bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto w-full px-8 flex gap-1">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? tab.color : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
              {active && (
                <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${tab.bar}`} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

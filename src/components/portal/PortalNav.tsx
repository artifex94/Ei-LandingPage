"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, CreditCard, Headphones, FolderOpen, User,
  Bell, CalendarDays, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/ui/LogoutButton";

// ── Definición de ítems ───────────────────────────────────────────────────────

interface NavDef {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  bar: string;
  alsoActive?: string[];
}

// Nav base para clientes
const NAV_CLIENTE: NavDef[] = [
  {
    href: "/portal/dashboard",
    label: "Mis servicios",
    mobileLabel: "Inicio",
    icon: ShieldCheck,
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    bar: "bg-orange-500",
  },
  {
    href: "/portal/pagos",
    label: "Pagos",
    mobileLabel: "Pagos",
    icon: CreditCard,
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    bar: "bg-emerald-500",
  },
  {
    href: "/portal/soporte",
    label: "Soporte",
    mobileLabel: "Soporte",
    icon: Headphones,
    text: "text-sky-400",
    bg: "bg-sky-500/15",
    bar: "bg-sky-500",
    alsoActive: ["/portal/solicitudes", "/portal/ot", "/portal/solicitud"],
  },
  {
    href: "/portal/documentos",
    label: "Documentos",
    mobileLabel: "Docs",
    icon: FolderOpen,
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    bar: "bg-amber-500",
    alsoActive: ["/portal/recibos", "/portal/facturas"],
  },
  {
    href: "/portal/perfil",
    label: "Mi perfil",
    mobileLabel: "Perfil",
    icon: User,
    text: "text-rose-400",
    bg: "bg-rose-500/15",
    bar: "bg-rose-500",
  },
];

// Ítem de eventos — solo desktop para clientes
const ITEM_EVENTOS: NavDef = {
  href: "/portal/eventos",
  label: "Eventos",
  mobileLabel: "Eventos",
  icon: Bell,
  text: "text-violet-400",
  bg: "bg-violet-500/15",
  bar: "bg-violet-500",
};

// Nav mobile para empleados (5 ítems priorizados)
const NAV_EMPLEADO_MOBILE: NavDef[] = [
  {
    href: "/portal/dashboard",
    label: "Mis servicios",
    mobileLabel: "Inicio",
    icon: ShieldCheck,
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    bar: "bg-orange-500",
  },
  {
    href: "/portal/mis-turnos",
    label: "Mis turnos",
    mobileLabel: "Turnos",
    icon: CalendarDays,
    text: "text-sky-400",
    bg: "bg-sky-500/15",
    bar: "bg-sky-500",
  },
  {
    href: "/portal/turno-actual",
    label: "Turno actual",
    mobileLabel: "Ahora",
    icon: Clock,
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    bar: "bg-emerald-500",
  },
  {
    href: "/portal/pagos",
    label: "Pagos",
    mobileLabel: "Pagos",
    icon: CreditCard,
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    bar: "bg-amber-500",
  },
  {
    href: "/portal/perfil",
    label: "Mi perfil",
    mobileLabel: "Perfil",
    icon: User,
    text: "text-rose-400",
    bg: "bg-rose-500/15",
    bar: "bg-rose-500",
  },
];

// Nav desktop para empleados (todos los ítems relevantes)
const NAV_EMPLEADO_DESKTOP: NavDef[] = [
  ...NAV_CLIENTE,
  {
    href: "/portal/mis-turnos",
    label: "Mis turnos",
    mobileLabel: "Turnos",
    icon: CalendarDays,
    text: "text-sky-400",
    bg: "bg-sky-500/15",
    bar: "bg-sky-500",
  },
  {
    href: "/portal/turno-actual",
    label: "Turno actual",
    mobileLabel: "Ahora",
    icon: Clock,
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    bar: "bg-emerald-500",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActive(pathname: string, nav: NavDef): boolean {
  if (pathname === nav.href || pathname.startsWith(nav.href + "/")) return true;
  return (nav.alsoActive ?? []).some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function DesktopLink({ nav, pathname }: { nav: NavDef; pathname: string }) {
  const active = isActive(pathname, nav);
  const Icon = nav.icon;

  return (
    <Link
      href={nav.href}
      className={`
        relative flex items-center gap-1.5 py-1 px-0.5 text-sm font-medium
        min-h-[44px] transition-colors duration-150 group
        ${active ? nav.text : "text-slate-400 hover:text-slate-200"}
      `}
    >
      <Icon
        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors
          ${active ? nav.text : "text-slate-500 group-hover:text-slate-300"}`}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span>{nav.label}</span>
      {active && (
        <span
          className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${nav.bar}`}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function BottomNavItem({ nav, pathname }: { nav: NavDef; pathname: string }) {
  const active = isActive(pathname, nav);
  const Icon = nav.icon;

  return (
    <Link
      href={nav.href}
      className={`
        flex-1 flex flex-col items-center justify-center gap-1
        min-h-[56px] py-2 rounded-xl transition-colors duration-150
        ${active ? `${nav.bg} ${nav.text}` : "text-slate-500"}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
        {nav.mobileLabel}
      </span>
    </Link>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface PortalNavProps {
  isEmpleado?: boolean;
}

export function PortalNav({ isEmpleado = false }: PortalNavProps) {
  const pathname = usePathname();

  const desktopItems = isEmpleado ? NAV_EMPLEADO_DESKTOP : [...NAV_CLIENTE, ITEM_EVENTOS];
  const mobileItems  = isEmpleado ? NAV_EMPLEADO_MOBILE  : NAV_CLIENTE;

  return (
    <>
      {/* ── Header desktop ─────────────────────────────────────────────────── */}
      <header className="hidden lg:block bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between gap-6">
          <Link href="/portal/dashboard" className="flex items-center gap-2 py-3 group flex-shrink-0">
            <div
              aria-hidden="true"
              className="h-8 w-8 bg-orange-700 rounded-md flex items-center justify-center text-white font-bold text-sm shadow shadow-orange-700/20 group-hover:scale-105 transition-transform"
            >
              EI
            </div>
            <span className="text-base font-semibold text-white">Escobar Instalaciones</span>
          </Link>

          <nav aria-label="Navegación principal del portal" className="flex items-center gap-5">
            {desktopItems.map((nav) => (
              <DesktopLink key={nav.href} nav={nav} pathname={pathname} />
            ))}
          </nav>

          <LogoutButton />
        </div>
      </header>

      {/* ── Topbar mobile ──────────────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 h-14 flex items-center justify-between">
        <Link href="/portal/dashboard" className="flex items-center gap-2 group">
          <div
            aria-hidden="true"
            className="h-7 w-7 bg-orange-700 rounded-md flex items-center justify-center text-white font-bold text-xs shadow shadow-orange-700/20 group-hover:scale-105 transition-transform"
          >
            EI
          </div>
          <span className="text-sm font-semibold text-white">Escobar Inst.</span>
        </Link>
        <LogoutButton />
      </header>

      {/* ── Bottom nav mobile ──────────────────────────────────────────────── */}
      <nav
        aria-label="Navegación principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 px-3 py-1 flex gap-1"
        style={{ paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom))" }}
      >
        {mobileItems.map((nav) => (
          <BottomNavItem key={nav.href} nav={nav} pathname={pathname} />
        ))}
      </nav>
    </>
  );
}

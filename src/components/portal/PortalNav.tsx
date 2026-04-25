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
  alsoActive?: string[];
}

const NAV_CLIENTE: NavDef[] = [
  {
    href: "/portal/dashboard",
    label: "Mis servicios",
    mobileLabel: "Inicio",
    icon: ShieldCheck,
  },
  {
    href: "/portal/pagos",
    label: "Pagos",
    mobileLabel: "Pagos",
    icon: CreditCard,
  },
  {
    href: "/portal/soporte",
    label: "Soporte",
    mobileLabel: "Soporte",
    icon: Headphones,
    alsoActive: ["/portal/solicitudes", "/portal/ot", "/portal/solicitud"],
  },
  {
    href: "/portal/documentos",
    label: "Documentos",
    mobileLabel: "Docs",
    icon: FolderOpen,
    alsoActive: ["/portal/recibos", "/portal/facturas"],
  },
  {
    href: "/portal/perfil",
    label: "Mi perfil",
    mobileLabel: "Perfil",
    icon: User,
  },
];

const ITEM_EVENTOS: NavDef = {
  href: "/portal/eventos",
  label: "Eventos",
  mobileLabel: "Eventos",
  icon: Bell,
};

const NAV_EMPLEADO_MOBILE: NavDef[] = [
  { href: "/portal/dashboard",   label: "Mis servicios", mobileLabel: "Inicio",  icon: ShieldCheck },
  { href: "/portal/mis-turnos",  label: "Mis turnos",    mobileLabel: "Turnos",  icon: CalendarDays },
  { href: "/portal/turno-actual",label: "Turno actual",  mobileLabel: "Ahora",   icon: Clock },
  { href: "/portal/pagos",       label: "Pagos",         mobileLabel: "Pagos",   icon: CreditCard },
  { href: "/portal/perfil",      label: "Mi perfil",     mobileLabel: "Perfil",  icon: User },
];

const NAV_EMPLEADO_DESKTOP: NavDef[] = [
  ...NAV_CLIENTE,
  { href: "/portal/mis-turnos",   label: "Mis turnos",  mobileLabel: "Turnos", icon: CalendarDays },
  { href: "/portal/turno-actual", label: "Turno actual",mobileLabel: "Ahora",  icon: Clock },
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
        ${active ? "text-tactical-500" : "text-slate-500 hover:text-slate-300"}
      `}
    >
      <Icon
        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors
          ${active ? "text-tactical-500" : "text-slate-600 group-hover:text-slate-400"}`}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span>{nav.label}</span>
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-tactical-500"
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
        min-h-[56px] py-2 rounded-sm transition-colors duration-150
        ${active ? "bg-tactical-500/10 text-tactical-500" : "text-slate-600 hover:text-slate-400"}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      <span className={`text-[10px] leading-none font-mono tracking-wide ${active ? "font-semibold" : "font-medium"}`}>
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
      <header className="hidden lg:block bg-industrial-800 border-b border-industrial-700">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between gap-6">
          <Link href="/portal/dashboard" className="flex items-center gap-2.5 py-3 group flex-shrink-0">
            <div
              aria-hidden="true"
              className="h-8 w-8 bg-tactical-500 rounded-sm flex items-center justify-center text-white font-bold text-xs shadow-[0_0_12px_rgba(241,119,32,0.2)] border border-tactical-600 border-b-[2px] group-hover:shadow-[0_0_16px_rgba(241,119,32,0.35)] transition-shadow"
            >
              EI
            </div>
            <div>
              <span className="text-sm font-semibold text-white block leading-tight">Escobar Instalaciones</span>
              <span className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">Mi Portal</span>
            </div>
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-industrial-900/98 backdrop-blur-sm border-b border-industrial-700 px-4 h-14 flex items-center justify-between">
        <Link href="/portal/dashboard" className="flex items-center gap-2 group">
          <div
            aria-hidden="true"
            className="h-7 w-7 bg-tactical-500 rounded-sm flex items-center justify-center text-white font-bold text-xs shadow-[0_0_8px_rgba(241,119,32,0.2)] border border-tactical-600 border-b-[2px]"
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-industrial-900/98 backdrop-blur-sm border-t border-industrial-700 px-3 py-1 flex gap-1"
        style={{ paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom))" }}
      >
        {mobileItems.map((nav) => (
          <BottomNavItem key={nav.href} nav={nav} pathname={pathname} />
        ))}
      </nav>
    </>
  );
}

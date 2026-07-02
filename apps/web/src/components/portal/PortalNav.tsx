"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, CreditCard, Headphones, FolderOpen, User,
  Bell, CalendarDays, Clock, MessageSquareWarning,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { NotificationBell } from "@/components/portal/NotificationBell";
import type { NotificacionItem } from "@/lib/notificaciones-feed";

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
    label: "Inicio",
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
    label: "Asistencia",
    mobileLabel: "Ayuda",
    icon: Headphones,
    alsoActive: ["/portal/solicitudes", "/portal/solicitud"],
  },
  {
    href: "/portal/documentos",
    label: "Documentos",
    mobileLabel: "Docs",
    icon: FolderOpen,
  },
  {
    href: "/portal/feedback",
    label: "Sugerencias",
    mobileLabel: "Sugerencias",
    icon: MessageSquareWarning,
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
  label: "Actividad",
  mobileLabel: "Actividad",
  icon: Bell,
};

// En mobile, Eventos reemplaza a Documentos (consulta esporádica, accesible
// desde los accesos rápidos del dashboard y el nav desktop). Sugerencias
// queda afuera del bottom nav (5 destinos máximo): se accede desde los
// accesos rápidos del dashboard y el nav desktop.
const NAV_CLIENTE_MOBILE: NavDef[] = NAV_CLIENTE
  .filter((nav) => nav.href !== "/portal/feedback")
  .map((nav) => (nav.href === "/portal/documentos" ? ITEM_EVENTOS : nav));

const NAV_EMPLEADO_MOBILE: NavDef[] = [
  { href: "/portal/dashboard",   label: "Inicio",        mobileLabel: "Inicio",  icon: ShieldCheck },
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
      aria-current={active ? "page" : undefined}
      className={`
        relative flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold
        transition-colors duration-150 group
        ${active ? "bg-white/[0.07] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}
      `}
    >
      <Icon
        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors
          ${active ? "text-tactical-400" : "text-slate-500 group-hover:text-slate-300"}`}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span>{nav.label}</span>
      {active && (
        <span
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-tactical-500"
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
      aria-current={active ? "page" : undefined}
      className={`
        flex-1 min-w-0 flex flex-col items-center justify-center gap-1
        relative min-h-[60px] py-2 transition-colors duration-150
        ${active ? "text-tactical-400" : "text-slate-500 hover:text-slate-200"}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      {active && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-tactical-500" aria-hidden="true" />}
      <span className={`max-w-full truncate text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
        {nav.mobileLabel}
      </span>
    </Link>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface PortalNavProps {
  isEmpleado?: boolean;
  feed?: NotificacionItem[];
  /** true cuando un ADMIN está impersonando: corre la topbar mobile debajo del ImpersonacionBanner (h-10, fijo arriba de todo). */
  impersonando?: boolean;
}

export function PortalNav({ isEmpleado = false, feed = [], impersonando = false }: PortalNavProps) {
  const pathname = usePathname();

  const desktopItems = isEmpleado ? NAV_EMPLEADO_DESKTOP : [...NAV_CLIENTE, ITEM_EVENTOS];
  const mobileItems  = isEmpleado ? NAV_EMPLEADO_MOBILE  : NAV_CLIENTE_MOBILE;

  return (
    <>
      {/* ── Header desktop ─────────────────────────────────────────────────── */}
      <header className="hidden border-b border-white/10 bg-industrial-950/90 backdrop-blur-xl lg:block">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-6">
          <Link href="/portal/dashboard" className="py-3 flex-shrink-0">
            <BrandLockup context="Mi Central" compact />
          </Link>

          <nav aria-label="Navegación principal de Mi Central" className="flex items-center gap-1">
            {desktopItems.map((nav) => (
              <DesktopLink key={nav.href} nav={nav} pathname={pathname} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell items={feed} variant="desktop" />
            <LogoutButton impersonando={impersonando} />
          </div>
        </div>
      </header>

      {/* ── Topbar mobile ──────────────────────────────────────────────────── */}
      <header
        className={`lg:hidden fixed left-0 right-0 z-30 bg-industrial-950/95 backdrop-blur-xl border-b border-white/10 px-4 h-14 flex items-center justify-between ${
          impersonando ? "top-10" : "top-0"
        }`}
      >
        <Link href="/portal/dashboard">
          <BrandLockup context="Mi Central" compact />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell items={feed} variant="mobile" />
          <LogoutButton impersonando={impersonando} />
        </div>
      </header>

      {/* ── Bottom nav mobile ──────────────────────────────────────────────── */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-30 flex gap-1 border-t border-white/10 bg-industrial-950/95 px-2 py-0 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom))" }}
      >
        {mobileItems.map((nav) => (
          <BottomNavItem key={nav.href} nav={nav} pathname={pathname} />
        ))}
      </nav>
    </>
  );
}

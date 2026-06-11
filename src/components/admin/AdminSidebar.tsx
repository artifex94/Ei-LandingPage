"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, ChevronDown,
  LayoutDashboard,
  Users, ShieldCheck, CreditCard, AlertTriangle, Wrench, FilePen,
  ClipboardList, CalendarDays, Truck, UserCog, CalendarCheck,
  Receipt, Bell, Briefcase,
  FileUp, Database, ScrollText, Radio, Settings, UmbrellaOff,
  UserPlus, Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/ui/LogoutButton";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type BadgeKey = "pendingSolicitudes" | "pendingMantenimiento" | "cuentasEnMora" | "otsPendientes" | "altasUsuarioPendientes" | "eventosSinProcesar";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: BadgeKey;
}

interface NavSection {
  id: "general" | "pendientes" | "campo" | "monitoreo" | "clientes" | "cobranzas" | "equipo" | "sistema";
  label: string | null;
  items: NavItem[];
}

// ── Estructura de navegación ──────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    id: "general",
    label: null,
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "pendientes",
    label: "Pendientes",
    items: [
      { href: "/admin/eventos",          label: "Eventos de alarma", icon: Bell,          badge: "eventosSinProcesar" },
      { href: "/admin/solicitudes-alta", label: "Altas de usuario",  icon: UserPlus,      badge: "altasUsuarioPendientes" },
      { href: "/admin/mantenimiento",    label: "Mantenimiento",     icon: Wrench,        badge: "pendingMantenimiento" },
      { href: "/admin/solicitudes-cambio", label: "Cambios de datos", icon: FilePen,      badge: "pendingSolicitudes" },
    ],
  },
  {
    id: "campo",
    label: "Campo",
    items: [
      { href: "/admin/ot",     label: "Órdenes de trabajo", icon: ClipboardList, badge: "otsPendientes" },
      { href: "/admin/agenda", label: "Agenda técnica",     icon: CalendarCheck },
    ],
  },
  {
    id: "monitoreo",
    label: "Monitoreo",
    items: [
      { href: "/admin/monitoreo", label: "En vivo",   icon: Activity },
      { href: "/admin/turnos",    label: "Turnos",    icon: CalendarDays },
      { href: "/admin/ausencias", label: "Ausencias", icon: UmbrellaOff },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    items: [
      { href: "/admin/clientes",  label: "Clientes",  icon: Users },
      { href: "/admin/cuentas",   label: "Cuentas",   icon: ShieldCheck },
      { href: "/admin/morosidad", label: "Morosidad", icon: AlertTriangle, badge: "cuentasEnMora" },
    ],
  },
  {
    id: "cobranzas",
    label: "Cobranzas",
    items: [
      { href: "/admin/pagos",       label: "Pagos",       icon: CreditCard },
      { href: "/admin/facturacion", label: "Facturación", icon: Receipt },
    ],
  },
  {
    id: "equipo",
    label: "Equipo",
    items: [
      { href: "/admin/trabajadores", label: "Trabajadores",      icon: Briefcase },
      { href: "/admin/tecnicos",     label: "Técnicos del portal", icon: UserCog },
      { href: "/admin/vehiculo",     label: "Vehículo",          icon: Truck },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { href: "/admin/importar",       label: "Importar datos", icon: FileUp },
      { href: "/admin/higienizar",     label: "Higienizar BD",  icon: Database },
      { href: "/admin/auditoria",      label: "Auditoría",      icon: ScrollText },
      { href: "/admin/sync-softguard", label: "SoftGuard",      icon: Radio },
      { href: "/admin/configuracion",  label: "Configuración",  icon: Settings },
    ],
  },
];

// ── Estilos por sección ───────────────────────────────────────────────────────

const SECTION_STYLE = {
  general: {
    labelColor:      "text-slate-500",
    dot:             "bg-slate-500",
    activeBg:        "bg-slate-700/60",
    activeText:      "text-white",
    activeBorder:    "border-l-2 border-slate-400",
    activeIconColor: "text-slate-300",
    inactiveIcon:    "text-slate-500",
    hoverBg:         "hover:bg-slate-800",
    chevron:         "text-slate-600",
    toggleHover:     "hover:bg-slate-800/40",
  },
  pendientes: {
    labelColor:      "text-rose-400",
    dot:             "bg-rose-500",
    activeBg:        "bg-rose-500/10",
    activeText:      "text-rose-100",
    activeBorder:    "border-l-2 border-rose-500",
    activeIconColor: "text-rose-400",
    inactiveIcon:    "text-slate-500",
    hoverBg:         "hover:bg-rose-500/5",
    chevron:         "text-rose-700",
    toggleHover:     "hover:bg-rose-500/5",
  },
  campo: {
    labelColor:      "text-indigo-400",
    dot:             "bg-indigo-500",
    activeBg:        "bg-indigo-500/10",
    activeText:      "text-indigo-100",
    activeBorder:    "border-l-2 border-indigo-500",
    activeIconColor: "text-indigo-400",
    inactiveIcon:    "text-slate-500",
    hoverBg:         "hover:bg-indigo-500/5",
    chevron:         "text-indigo-600",
    toggleHover:     "hover:bg-indigo-500/5",
  },
  monitoreo: {
    labelColor:      "text-cyan-400",
    dot:             "bg-cyan-500",
    activeBg:        "bg-cyan-500/10",
    activeText:      "text-cyan-100",
    activeBorder:    "border-l-2 border-cyan-500",
    activeIconColor: "text-cyan-400",
    inactiveIcon:    "text-slate-500",
    hoverBg:         "hover:bg-cyan-500/5",
    chevron:         "text-cyan-700",
    toggleHover:     "hover:bg-cyan-500/5",
  },
  clientes: {
    labelColor:      "text-blue-400",
    dot:             "bg-blue-500",
    activeBg:        "bg-blue-500/10",
    activeText:      "text-blue-100",
    activeBorder:    "border-l-2 border-blue-500",
    activeIconColor: "text-blue-400",
    inactiveIcon:    "text-slate-500",
    hoverBg:         "hover:bg-blue-500/5",
    chevron:         "text-blue-600",
    toggleHover:     "hover:bg-blue-500/5",
  },
  cobranzas: {
    labelColor:      "text-emerald-400",
    dot:             "bg-emerald-500",
    activeBg:        "bg-emerald-500/10",
    activeText:      "text-emerald-100",
    activeBorder:    "border-l-2 border-emerald-500",
    activeIconColor: "text-emerald-400",
    inactiveIcon:    "text-slate-500",
    hoverBg:         "hover:bg-emerald-500/5",
    chevron:         "text-emerald-600",
    toggleHover:     "hover:bg-emerald-500/5",
  },
  equipo: {
    labelColor:      "text-amber-400",
    dot:             "bg-amber-500",
    activeBg:        "bg-amber-500/10",
    activeText:      "text-amber-100",
    activeBorder:    "border-l-2 border-amber-500",
    activeIconColor: "text-amber-400",
    inactiveIcon:    "text-slate-500",
    hoverBg:         "hover:bg-amber-500/5",
    chevron:         "text-amber-600",
    toggleHover:     "hover:bg-amber-500/5",
  },
  sistema: {
    labelColor:      "text-slate-500",
    dot:             "bg-slate-600",
    activeBg:        "bg-slate-700/40",
    activeText:      "text-slate-300",
    activeBorder:    "border-l-2 border-slate-600",
    activeIconColor: "text-slate-400",
    inactiveIcon:    "text-slate-600",
    hoverBg:         "hover:bg-slate-800/60",
    chevron:         "text-slate-700",
    toggleHover:     "hover:bg-slate-800/40",
  },
} satisfies Record<NavSection["id"], object>;

const BADGE_COLOR: Record<BadgeKey, string> = {
  pendingSolicitudes:      "bg-orange-500",
  pendingMantenimiento:    "bg-sky-500",
  cuentasEnMora:           "bg-red-500",
  otsPendientes:           "bg-amber-500",
  altasUsuarioPendientes:  "bg-orange-500",
  eventosSinProcesar:      "bg-red-600",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSectionForPath(path: string): NavSection["id"] | null {
  for (const section of NAV_SECTIONS) {
    if (section.items.some((item) => path === item.href || path.startsWith(item.href + "/"))) {
      return section.id;
    }
  }
  return null;
}

function sectionHasBadge(section: NavSection, badges: Record<BadgeKey, number>): boolean {
  return section.items.some((item) => item.badge && badges[item.badge] > 0);
}

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  item,
  sectionId,
  badges,
  onClick,
}: {
  item: NavItem;
  sectionId: NavSection["id"];
  badges: Record<BadgeKey, number>;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const s = SECTION_STYLE[sectionId];
  const Icon = item.icon;
  const badgeCount = item.badge ? badges[item.badge] : 0;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm min-h-[44px] lg:min-h-[40px] transition-colors duration-150 ${
        isActive
          ? `${s.activeBg} ${s.activeText} ${s.activeBorder}`
          : `text-slate-400 ${s.hoverBg} hover:text-slate-200`
      }`}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${isActive ? s.activeIconColor : s.inactiveIcon}`}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
      <span className="flex-1 truncate leading-tight">{item.label}</span>
      {badgeCount > 0 && (
        <span className={`${BADGE_COLOR[item.badge!]} text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none flex-shrink-0`}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}

// ── NavSection colapsable ─────────────────────────────────────────────────────

function CollapsibleSection({
  section,
  badges,
  isOpen,
  onToggle,
  onLinkClick,
}: {
  section: NavSection;
  badges: Record<BadgeKey, number>;
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick?: () => void;
}) {
  const s = SECTION_STYLE[section.id];
  const hasBadge = sectionHasBadge(section, badges);

  return (
    <li>
      {/* Toggle del grupo */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`nav-section-${section.id}`}
        className={`w-full flex items-center gap-2 px-3 pt-3.5 pb-1.5 rounded-md transition-colors duration-150 ${s.toggleHover}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
        <span className={`text-xs font-bold uppercase tracking-widest flex-1 text-left ${s.labelColor}`}>
          {section.label}
        </span>
        {/* Punto de alerta cuando la sección está cerrada y tiene badges */}
        {!isOpen && hasBadge && (
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
        )}
        <ChevronDown
          className={`w-3 h-3 flex-shrink-0 ${s.chevron} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Items con animación grid */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <ul id={`nav-section-${section.id}`} className="overflow-hidden space-y-0.5" role="list">
          {section.items.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                sectionId={section.id}
                badges={badges}
                onClick={onLinkClick}
              />
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

// ── Contenido de navegación ───────────────────────────────────────────────────

function NavContent({
  badges,
  openSections,
  onToggle,
  onLinkClick,
}: {
  badges: Record<BadgeKey, number>;
  openSections: Set<NavSection["id"]>;
  onToggle: (id: NavSection["id"]) => void;
  onLinkClick?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5" role="list">
      {NAV_SECTIONS.map((section) =>
        section.label === null ? (
          // Dashboard — sin toggle
          <li key={section.id}>
            <ul role="list" className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    sectionId={section.id}
                    badges={badges}
                    onClick={onLinkClick}
                  />
                </li>
              ))}
            </ul>
          </li>
        ) : (
          <CollapsibleSection
            key={section.id}
            section={section}
            badges={badges}
            isOpen={openSections.has(section.id)}
            onToggle={() => onToggle(section.id)}
            onLinkClick={onLinkClick}
          />
        )
      )}
    </ul>
  );
}

// ── Marca e identidad ─────────────────────────────────────────────────────────

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
      <div
        aria-hidden="true"
        className={`${compact ? "h-7 w-7" : "h-8 w-8"} bg-tactical-500 rounded-sm flex items-center justify-center text-white font-display font-bold text-xs border border-tactical-600 border-b-[2px] shadow-[0_0_8px_rgba(241,119,32,0.2)] group-hover:shadow-[0_0_14px_rgba(241,119,32,0.35)] transition-shadow`}
      >
        EI
      </div>
      {compact ? (
        <span className="text-sm font-display font-semibold text-white">Escobar · Admin</span>
      ) : (
        <div>
          <span className="text-sm font-display font-semibold text-white block leading-tight">
            Escobar Instalaciones
          </span>
          <span className="text-xs text-slate-400 font-mono tracking-widest uppercase">Admin</span>
        </div>
      )}
    </Link>
  );
}

function SidebarFooter({ nombreAdmin }: { nombreAdmin: string }) {
  const inicial = nombreAdmin.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="flex-shrink-0 px-4 py-4 border-t border-industrial-700/60 space-y-2">
      <div className="flex items-center gap-2.5 px-1">
        <div
          aria-hidden="true"
          className="h-8 w-8 rounded-sm bg-industrial-800 border border-industrial-700 flex items-center justify-center text-xs font-display font-bold text-tactical-400"
        >
          {inicial}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-300 truncate">{nombreAdmin}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Administrador</p>
        </div>
      </div>
      <LogoutButton variant="sidebar" />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminSidebar({
  nombreAdmin,
  pendingSolicitudes = 0,
  pendingMantenimiento = 0,
  cuentasEnMora = 0,
  otsPendientes = 0,
  altasUsuarioPendientes = 0,
  eventosSinProcesar = 0,
}: {
  nombreAdmin: string;
  pendingSolicitudes?: number;
  pendingMantenimiento?: number;
  cuentasEnMora?: number;
  otsPendientes?: number;
  altasUsuarioPendientes?: number;
  eventosSinProcesar?: number;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const seccionActual = getSectionForPath(pathname);
  const [openSections, setOpenSections] = useState<Set<NavSection["id"]>>(
    () => new Set(seccionActual ? [seccionActual] : [])
  );

  // Abre la sección de la ruta actual al navegar (link directo / cambio de ruta)
  // ajustando el estado DURANTE el render — patrón recomendado de React para
  // derivar estado de un valor cambiante, sin useEffect ni renders en cascada.
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  if (pathname !== rutaPrevia) {
    setRutaPrevia(pathname);
    if (seccionActual && !openSections.has(seccionActual)) {
      setOpenSections((prev) => new Set([...prev, seccionActual]));
    }
  }

  // Cerrar el drawer con Escape (UX teclado en móvil/tablet con teclado)
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  function toggleSection(id: NavSection["id"]) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const badges: Record<BadgeKey, number> = {
    pendingSolicitudes,
    pendingMantenimiento,
    cuentasEnMora,
    otsPendientes,
    altasUsuarioPendientes,
    eventosSinProcesar,
  };

  const totalAlertas = pendingSolicitudes + pendingMantenimiento + cuentasEnMora + otsPendientes + altasUsuarioPendientes + eventosSinProcesar;

  return (
    <>
      {/* ── Topbar mobile ─────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-industrial-900/95 backdrop-blur-sm border-b border-industrial-700 px-4 h-14 flex items-center justify-between">
        <BrandBlock compact />
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-white p-2 hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors relative"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5" />
          {totalAlertas > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {/* ── Overlay drawer mobile ──────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer mobile ─────────────────────────────────────────────────── */}
      <nav
        aria-label="Navegación del administrador (móvil)"
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-industrial-900 border-r border-industrial-700 flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-industrial-700/60 flex-shrink-0">
          <BrandBlock />
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-slate-500 hover:text-white p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items scrollables */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-3 px-3">
          <NavContent
            badges={badges}
            openSections={openSections}
            onToggle={toggleSection}
            onLinkClick={() => setDrawerOpen(false)}
          />
        </div>

        <SidebarFooter nombreAdmin={nombreAdmin} />
      </nav>

      {/* ── Sidebar fijo desktop ───────────────────────────────────────────── */}
      <nav
        aria-label="Navegación del administrador"
        className="hidden lg:flex sticky top-0 h-screen w-56 flex-col bg-industrial-900 border-r border-industrial-700/60 flex-shrink-0"
      >
        <div className="px-4 py-4 flex-shrink-0 border-b border-industrial-700/60">
          <BrandBlock />
        </div>

        {/* Items scrollables */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-3 px-3">
          <NavContent
            badges={badges}
            openSections={openSections}
            onToggle={toggleSection}
          />
        </div>

        <SidebarFooter nombreAdmin={nombreAdmin} />
      </nav>
    </>
  );
}

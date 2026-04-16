"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/ui/LogoutButton";

const NAV_ITEMS = [
  { href: "/admin/dashboard",          label: "Dashboard" },
  { href: "/admin/clientes",           label: "Clientes" },
  { href: "/admin/cuentas",            label: "Cuentas" },
  { href: "/admin/pagos",              label: "Pagos" },
  { href: "/admin/morosidad",          label: "Morosidad" },
  { href: "/admin/mantenimiento",      label: "Mantenimiento" },
  { href: "/admin/solicitudes-cambio", label: "Cambios de datos" },
  { href: "/admin/importar",           label: "Importar CSV" },
  { href: "/admin/higienizar",         label: "Higienizar BD" },
  { href: "/admin/auditoria",          label: "Auditoría" },
];

export function AdminSidebar({
  nombreAdmin,
  pendingSolicitudes = 0,
  pendingMantenimiento = 0,
}: {
  nombreAdmin: string;
  pendingSolicitudes?: number;
  pendingMantenimiento?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Barra superior — solo mobile ─────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 border-b border-slate-700 px-4 h-14 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Admin
        </span>
        <button
          onClick={() => setOpen(true)}
          className="text-white p-2 hover:bg-slate-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Overlay oscuro detrás del drawer ─────────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer mobile ────────────────────────────────────────────────────── */}
      <nav
        aria-label="Navegación del administrador"
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 border-r border-slate-700 flex flex-col py-6 px-4 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Admin
          </p>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="flex flex-col gap-1 flex-1" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-700 hover:text-white min-h-[44px] flex items-center justify-between gap-2 transition-colors"
              >
                <span>{item.label}</span>
                {item.href === "/admin/solicitudes-cambio" && pendingSolicitudes > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                    {pendingSolicitudes}
                  </span>
                )}
                {item.href === "/admin/mantenimiento" && pendingMantenimiento > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                    {pendingMantenimiento}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="pt-6 border-t border-slate-700 space-y-2">
          <p className="text-xs text-slate-400 px-2">{nombreAdmin}</p>
          <LogoutButton variant="sidebar" />
        </div>
      </nav>

      {/* ── Sidebar permanente — solo desktop ────────────────────────────────── */}
      <nav
        aria-label="Navegación del administrador"
        className="hidden lg:flex w-56 bg-slate-900 text-slate-100 flex-col py-6 px-4 shrink-0 border-r border-slate-700"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 px-2">
          Admin
        </p>
        <ul className="flex flex-col gap-1 flex-1" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-700 hover:text-white min-h-[44px] flex items-center justify-between gap-2 transition-colors"
              >
                <span>{item.label}</span>
                {item.href === "/admin/solicitudes-cambio" && pendingSolicitudes > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                    {pendingSolicitudes}
                  </span>
                )}
                {item.href === "/admin/mantenimiento" && pendingMantenimiento > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                    {pendingMantenimiento}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6 border-t border-slate-700 space-y-2">
          <p className="text-xs text-slate-400 px-2">{nombreAdmin}</p>
          <LogoutButton variant="sidebar" />
        </div>
      </nav>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LogoutButton } from "@/components/ui/LogoutButton";

export const metadata: Metadata = {
  title: "Admin — Escobar Instalaciones",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") redirect("/portal/dashboard");

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Ir al contenido principal
      </a>

      <div className="min-h-screen flex bg-slate-900">
        {/* Sidebar */}
        <nav
          aria-label="Navegación del administrador"
          className="w-56 bg-slate-900 text-slate-100 flex flex-col py-6 px-4 shrink-0"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 px-2">
            Admin
          </p>
          <ul className="flex flex-col gap-1" role="list">
            {[
              { href: "/admin/dashboard", label: "Dashboard" },
              { href: "/admin/clientes", label: "Clientes" },
              { href: "/admin/cuentas", label: "Cuentas" },
              { href: "/admin/pagos", label: "Pagos" },
              { href: "/admin/importar", label: "Importar CSV" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm hover:bg-slate-700 min-h-[44px] flex items-center"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6 border-t border-slate-700 space-y-2">
            <p className="text-xs text-slate-400 px-2">{perfil?.nombre}</p>
            <LogoutButton variant="sidebar" />
          </div>
        </nav>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-8 overflow-auto"
        >
          {children}
        </main>
      </div>
    </>
  );
}

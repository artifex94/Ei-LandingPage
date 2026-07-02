import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { AreaNav, type AreaNavItem } from "@/components/operacion/AreaNav";

export const metadata: Metadata = {
  title: {
    default: "Cobros — EI",
    template: "%s — Cobros EI",
  },
  robots: { index: false, follow: false },
};

const NAV: AreaNavItem[] = [
  { href: "/cobros", label: "Morosidad", icon: "AlertTriangle" },
  { href: "/cobros/pagos", label: "Pagos", icon: "CreditCard" },
  { href: "/cobros/conciliacion", label: "Conciliación", icon: "ArrowLeftRight" },
];

export default async function CobrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, perfil } = await requireSesion();

  // Gate fino por capacidad: ADMIN ve todo; el resto necesita puede_facturar.
  // FAIL-CLOSED, mismo patrón que el panel técnico y el de monitoreo.
  if (perfil.rol !== "ADMIN") {
    const empleado = await prisma.empleado.findFirst({
      where: { perfil_id: userId },
      select: { puede_facturar: true },
    });
    if (!empleado?.puede_facturar) redirect("/portal/dashboard");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-industrial-900 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:bg-orange-500 focus-visible:text-slate-900 focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-lg focus-visible:text-sm focus-visible:font-semibold"
      >
        Ir al contenido principal
      </a>

      <div className="sticky top-0 z-40">
        <header className="bg-industrial-800 border-b border-industrial-700 py-3">
          <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 flex items-center justify-between">
            <Link href="/cobros">
              <BrandLockup context="Cobros" compact />
            </Link>
            <div className="flex items-center gap-3">
              <LogoutButton />
            </div>
          </div>
        </header>
        <AreaNav items={NAV} />
      </div>

      <main
        id="main-content"
        className="flex-1 px-4 lg:px-8 py-5 max-w-2xl lg:max-w-7xl mx-auto w-full pb-24 lg:pb-8 text-slate-300"
      >
        {children}
      </main>

      <AreaNav items={NAV} mobile />
    </div>
  );
}

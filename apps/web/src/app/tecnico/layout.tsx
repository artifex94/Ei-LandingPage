import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { TecnicoTabNav } from "@/components/tecnico/TecnicoTabNav";
import { BrandLockup } from "@/components/layout/BrandLockup";

export const metadata: Metadata = {
  title: {
    default: "Panel Técnico — EI",
    template: "%s — Técnico EI",
  },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default async function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const { userId, perfil } = await requireSesion();
  const empleado = await prisma.empleado.findFirst({
    where: { perfil_id: userId },
    select: { puede_instalar: true },
  });

  // Aislamiento por capacidad: ADMIN o quien tenga puede_instalar. No alcanza
  // con rol TECNICO a secas — los agentes de Monitoreo/Cobros también son
  // TECNICO y no deben colarse acá. Todos los técnicos reales tienen el flag.
  if (perfil.rol !== "ADMIN" && !empleado?.puede_instalar) {
    redirect("/portal/dashboard");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-industrial-900 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:bg-orange-500 focus-visible:text-slate-900 focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-lg focus-visible:text-sm focus-visible:font-semibold"
      >
        Ir al contenido principal
      </a>

      {/* ── Header + tab nav: bloque sticky único (sin offsets mágicos) ────── */}
      <div className="sticky top-0 z-40">
        <header className="bg-industrial-800 border-b border-industrial-700 py-3">
          <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 flex items-center justify-between">
            <Link href="/tecnico/mi-dia">
              <BrandLockup context="Panel técnico" compact />
            </Link>
            <div className="flex items-center gap-3">
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Tab nav desktop, pegado al header dentro del mismo bloque sticky */}
        <TecnicoTabNav />
      </div>

      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      <main id="main-content" className="flex-1 px-4 lg:px-8 py-5 max-w-2xl lg:max-w-7xl mx-auto w-full pb-24 lg:pb-8 text-slate-300">
        {children}
      </main>

      {/* ── Bottom nav mobile ───────────────────────────────────────────────── */}
      <TecnicoTabNav mobile />
    </div>
  );
}

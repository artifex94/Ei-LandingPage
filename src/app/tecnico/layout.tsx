import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { TecnicoTabNav } from "@/components/tecnico/TecnicoTabNav";

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

  if (perfil.rol !== "ADMIN" && perfil.rol !== "TECNICO" && !empleado?.puede_instalar) {
    redirect("/portal/dashboard");
  }

  return (
    <div className="min-h-screen bg-industrial-900 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-orange-500 focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Ir al contenido principal
      </a>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-industrial-800 border-b border-industrial-700 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto w-full px-4 flex items-center justify-between">
          <Link href="/tecnico/mi-dia" className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 bg-tactical-500 rounded-sm flex items-center justify-center text-white font-bold text-xs
                         border border-tactical-600 border-b-[2px] shadow-[0_0_8px_rgba(241,119,32,0.2)]"
            >
              EI
            </div>
            <div>
              <span className="text-sm font-semibold text-white block leading-tight">Panel Técnico</span>
              <span className="text-xs text-slate-400 font-mono tracking-widest uppercase">Escobar Instalaciones</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ── Tab nav (debajo del header, desktop) ────────────────────────────── */}
      <TecnicoTabNav />

      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      <main id="main-content" className="flex-1 px-4 lg:px-8 py-5 max-w-2xl lg:max-w-7xl mx-auto w-full pb-24 lg:pb-8 text-slate-300">
        {children}
      </main>

      {/* ── Bottom nav mobile ───────────────────────────────────────────────── */}
      <TecnicoTabNav mobile />
    </div>
  );
}

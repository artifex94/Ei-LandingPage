import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { TecnicoTabNav } from "@/components/tecnico/TecnicoTabNav";

export const metadata: Metadata = {
  title: "Panel Técnico — EI",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default async function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({
    where: { id: user.id },
    select: { nombre: true, rol: true, empleado: { select: { puede_instalar: true } } },
  });

  if (!perfil || (perfil.rol !== "ADMIN" && perfil.rol !== "TECNICO" && !perfil.empleado?.puede_instalar)) {
    redirect("/portal/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto w-full px-4 flex items-center justify-between">
          <Link href="/tecnico/mi-dia" className="flex items-center gap-2">
            <div className="h-7 w-7 bg-orange-700 rounded-md flex items-center justify-center text-white font-bold text-xs">EI</div>
            <span className="text-sm font-semibold text-white">Panel Técnico</span>
          </Link>
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ── Tab nav (debajo del header, desktop) ────────────────────────────── */}
      <TecnicoTabNav />

      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 lg:px-8 py-5 max-w-2xl lg:max-w-7xl mx-auto w-full pb-24 lg:pb-8">
        {children}
      </main>

      {/* ── Bottom nav mobile ───────────────────────────────────────────────── */}
      <TecnicoTabNav mobile />
    </div>
  );
}

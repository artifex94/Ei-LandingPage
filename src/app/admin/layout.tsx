import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

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

  const [pendingSolicitudes, pendingMantenimiento, cuentasEnMora] = await Promise.all([
    prisma.solicitudCambioInfo.count({ where: { estado: "PENDIENTE" } }),
    prisma.solicitudMantenimiento.count({ where: { estado: { not: "RESUELTA" } } }),
    prisma.pago.groupBy({
      by: ["cuenta_id"],
      where: { estado: "VENCIDO" },
      _count: true,
    }).then((rows) => rows.length),
  ]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Ir al contenido principal
      </a>

      <div className="min-h-screen flex bg-slate-900">
        <AdminSidebar
          nombreAdmin={perfil?.nombre ?? "Admin"}
          pendingSolicitudes={pendingSolicitudes}
          pendingMantenimiento={pendingMantenimiento}
          cuentasEnMora={cuentasEnMora}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-8"
        >
          {children}
        </main>
      </div>
    </>
  );
}

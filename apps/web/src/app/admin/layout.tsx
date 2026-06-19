import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { EstadoSistemaBar } from "@/components/admin/EstadoSistemaBar";
import { AreaContextBar } from "@/components/admin/AreaContextBar";

export const metadata: Metadata = {
  title: {
    default: "Admin — Escobar Instalaciones",
    template: "%s — Admin EI",
  },
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await requireAdmin();

  const hace3dias = new Date();
  hace3dias.setDate(hace3dias.getDate() - 3);

  const [pendingSolicitudes, pendingMantenimiento, cuentasEnMora, otsPendientes, altasUsuarioPendientes, eventosSinProcesar] =
    await Promise.all([
      prisma.solicitudCambioInfo.count({ where: { estado: "PENDIENTE" } }),
      prisma.solicitudMantenimiento.count({ where: { estado: { not: "RESUELTA" } } }),
      prisma.cuenta.count({ where: { pagos: { some: { estado: "VENCIDO" } } } }),
      prisma.ordenTrabajo.count({
        where: {
          estado: { notIn: ["COMPLETADA", "CANCELADA"] },
          OR: [
            { fecha_visita: { lt: new Date() }, estado: { notIn: ["COMPLETADA", "CANCELADA", "EN_SITIO", "EN_RUTA"] } },
            { estado: "SOLICITADA", created_at: { lt: hace3dias } },
          ],
        },
      }),
      prisma.altaUsuario.count({ where: { estado: "PENDIENTE" } }),
      prisma.eventoAlarma.count({ where: { estado: "NUEVO" } }),
    ]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Ir al contenido principal
      </a>

      <div className="min-h-screen flex bg-industrial-900">
        <AdminSidebar
          nombreAdmin={perfil?.nombre ?? "Admin"}
          pendingSolicitudes={pendingSolicitudes}
          pendingMantenimiento={pendingMantenimiento}
          cuentasEnMora={cuentasEnMora}
          otsPendientes={otsPendientes}
          altasUsuarioPendientes={altasUsuarioPendientes}
          eventosSinProcesar={eventosSinProcesar}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-8"
        >
          <EstadoSistemaBar
            eventosSinProcesar={eventosSinProcesar}
            pendingMantenimiento={pendingMantenimiento}
            altasUsuarioPendientes={altasUsuarioPendientes}
            pendingSolicitudes={pendingSolicitudes}
            cuentasEnMora={cuentasEnMora}
            otsPendientes={otsPendientes}
          />
          <RefreshButton />
          <AreaContextBar />
          {children}
        </main>
      </div>
    </>
  );
}

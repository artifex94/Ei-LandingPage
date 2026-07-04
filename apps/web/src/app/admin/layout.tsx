import type { Metadata } from "next";
import { contarPendientesAdmin } from "@/lib/admin-counts";
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

  const {
    pendingSolicitudes, pendingMantenimiento, cuentasEnMora, otsPendientes,
    altasUsuarioPendientes, eventosSinProcesar, morososSinContactar,
    feedbackPendiente, cambiosTurnoPendientes,
  } = await contarPendientesAdmin();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:bg-white focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-lg focus-visible:shadow-lg"
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
          morososSinContactar={morososSinContactar}
          feedbackPendiente={feedbackPendiente}
          cambiosTurnoPendientes={cambiosTurnoPendientes}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex-1 overflow-auto bg-[radial-gradient(circle_at_80%_0%,rgba(241,119,32,0.035),transparent_28%)] p-4 pt-16 sm:p-6 sm:pt-16 lg:p-7"
        >
          <div className="mx-auto w-full max-w-[1500px]">
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
          </div>
        </main>
      </div>
    </>
  );
}

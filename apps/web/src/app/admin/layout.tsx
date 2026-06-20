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

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();
  // Mismo criterio de mora que /admin/morosidad y /admin/mensajeria (VENCIDO o PENDIENTE
  // de un mes anterior), para que el badge no subestime respecto del hub.
  const filtroPagoVencido = {
    OR: [
      { estado: "VENCIDO" as const },
      {
        estado: "PENDIENTE" as const,
        OR: [{ anio: { lt: anioActual } }, { anio: anioActual, mes: { lt: mesActual } }],
      },
    ],
  };

  const [
    pendingSolicitudes, pendingMantenimiento, cuentasEnMora, otsPendientes,
    altasUsuarioPendientes, eventosSinProcesar, perfilesEnMora, contactadosMes,
  ] = await Promise.all([
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
      prisma.cuenta.findMany({
        where: { estado: { not: "BAJA_DEFINITIVA" }, pagos: { some: filtroPagoVencido } },
        select: { perfil_id: true },
      }),
      prisma.notificacionCliente.findMany({
        where: { origen: "COBRANZA", canal: "WHATSAPP_WALINK", fecha_envio: { gte: inicioMes } },
        select: { perfil_id: true },
      }),
    ]);

  // Morosos que todavía no fueron contactados por WhatsApp manual este mes.
  const contactadosSet = new Set(contactadosMes.map((c) => c.perfil_id));
  const morososSinContactar = new Set(
    perfilesEnMora.map((c) => c.perfil_id).filter((id) => !contactadosSet.has(id)),
  ).size;

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
          morososSinContactar={morososSinContactar}
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

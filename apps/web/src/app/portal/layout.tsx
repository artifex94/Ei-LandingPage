import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { calcularEstadoFinanciero, peorEstadoFinanciero } from "@/lib/billing-state";
import { DIAS_GRACIA, DIAS_SUSPENSION } from "@/lib/constants/billing";
import { getParam } from "@/lib/parametros";
import { construirFeedNotificaciones } from "@/lib/notificaciones-feed";
import { PagoRequeridoGuard } from "@/components/portal/PagoRequeridoGuard";
import { PortalNav } from "@/components/portal/PortalNav";
import { ImpersonacionBanner } from "@/components/portal/ImpersonacionBanner";
import "./portal.css";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: "Mi Central — Escobar Instalaciones",
    template: "%s — Mi Central EI",
  },
  robots: "noindex, nofollow",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, perfil, impersonacion } = await requireSesion();

  // Segunda línea de defensa: el middleware ya debería haber redirigido,
  // pero si por algún motivo llega un ADMIN o TECNICO aquí, los enviamos
  // a su área correspondiente sin ejecutar la lógica de cliente. Nótese que
  // `perfil.rol` acá ya refleja la impersonación (getSesion() resuelve el
  // perfil del CLIENTE impersonado), así que un ADMIN impersonando pasa este
  // check con normalidad; solo un ADMIN SIN cookie válida cae en el redirect.
  if (perfil.rol === "ADMIN")   redirect("/admin/dashboard");
  if (perfil.rol === "TECNICO") redirect("/tecnico/mi-dia");

  const [cuentas, empleado] = await Promise.all([
    prisma.cuenta.findMany({
      where: {
        perfil_id: userId,
        estado: { not: "BAJA_DEFINITIVA" },
      },
      select: {
        id: true,
        estado: true,
        override_activo: true,
        override_expira: true,
        pagos: {
          where: { estado: { in: ["PENDIENTE", "VENCIDO", "PROCESANDO"] } },
          select: { estado: true, mes: true, anio: true, importe: true },
        },
      },
    }),
    prisma.empleado.findFirst({ where: { perfil_id: userId }, select: { id: true } }),
  ]);

  const [diasGracia, diasSuspension] = await Promise.all([
    getParam("DIAS_GRACIA", DIAS_GRACIA),
    getParam("DIAS_SUSPENSION", DIAS_SUSPENSION),
  ]);
  const estados = cuentas.map((c) =>
    calcularEstadoFinanciero(c.estado, c.pagos, c.override_activo, c.override_expira, { diasGracia, diasSuspension })
  );
  const peorEstado = peorEstadoFinanciero(estados);

  const feed = await construirFeedNotificaciones({ userId, peorEstado });

  const deudaTotal =
    peorEstado.tipo === "SUSPENDED"
      ? cuentas.reduce(
          (sum, c) =>
            sum +
            c.pagos
              .filter((p) => p.estado === "VENCIDO" || p.estado === "PENDIENTE")
              .reduce((s, p) => s + Number(p.importe), 0),
          0
        )
      : 0;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:bg-white focus-visible:text-slate-900 focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-lg focus-visible:shadow-lg focus-visible:text-lg focus-visible:font-medium"
      >
        Ir al contenido principal
      </a>

      {/* Vista admin: el modal de PagoRequeridoGuard sigue mostrándose (el
          admin ve exactamente lo que ve el cliente), pero el banner corre
          por encima (z-60 > z-50 del modal) para que "Salir" siga accesible. */}
      {impersonacion && <ImpersonacionBanner clienteNombre={perfil.nombre} />}

      {peorEstado.tipo === "SUSPENDED" && (
        <PagoRequeridoGuard deudaTotal={deudaTotal} impersonando={!!impersonacion} />
      )}

      <div className={`portal-shell min-h-screen bg-industrial-900 flex flex-col ${impersonacion ? "pt-10" : ""}`}>
        <PortalNav isEmpleado={!!empleado} feed={feed} impersonando={!!impersonacion} />

        <main
          id="main-content"
          tabIndex={-1}
          className="portal-main flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:px-6
                     pt-[calc(3.5rem+1.5rem)] lg:pt-7
                     pb-[calc(4.5rem+env(safe-area-inset-bottom)+1rem)] lg:pb-8"
        >
          {children}
        </main>

        {/* Footer solo en desktop */}
        <footer className="hidden lg:block bg-industrial-800 border-t border-industrial-700 px-4 py-4 text-center">
          <span className="text-xs text-slate-400 font-mono tracking-wide">
            Escobar Instalaciones — Soporte:{" "}
            <a
              href={siteConfig.contact.whatsappLink}
              className="text-tactical-500 hover:text-tactical-400 transition-colors"
            >
              {siteConfig.contact.phoneLocal}
            </a>
          </span>
        </footer>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { calcularEstadoFinanciero, peorEstadoFinanciero } from "@/lib/billing-state";
import { PagoRequeridoGuard } from "@/components/portal/PagoRequeridoGuard";
import { PortalNav } from "@/components/portal/PortalNav";
import "./portal.css";

export const metadata: Metadata = {
  title: "Mi Portal — Escobar Instalaciones",
  robots: "noindex, nofollow",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Segunda línea de defensa: el middleware ya debería haber redirigido,
  // pero si por algún motivo llega un ADMIN o TECNICO aquí, los enviamos
  // a su área correspondiente sin ejecutar la lógica de cliente.
  const rolCheck = await prisma.perfil.findUnique({
    where: { id: user.id },
    select: { rol: true },
  });
  if (rolCheck?.rol === "ADMIN")   redirect("/admin/dashboard");
  if (rolCheck?.rol === "TECNICO") redirect("/tecnico/mi-dia");

  const [cuentas, empleado] = await Promise.all([
    prisma.cuenta.findMany({
      where: {
        perfil_id: user.id,
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
    prisma.empleado.findFirst({ where: { perfil_id: user.id }, select: { id: true } }),
  ]);

  const estados = cuentas.map((c) =>
    calcularEstadoFinanciero(c.estado, c.pagos, c.override_activo, c.override_expira)
  );
  const peorEstado = peorEstadoFinanciero(estados);

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
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-lg focus:font-medium"
      >
        Ir al contenido principal
      </a>

      {peorEstado.tipo === "SUSPENDED" && (
        <PagoRequeridoGuard deudaTotal={deudaTotal} />
      )}

      <div className="min-h-screen bg-slate-900 flex flex-col">
        <PortalNav isEmpleado={!!empleado} />

        {/* Banner mora — ámbar */}
        {peorEstado.tipo === "GRACE_PERIOD" && (
          <div
            role="alert"
            className="bg-amber-900/80 border-b border-amber-700 px-4 py-2.5 text-center text-sm text-amber-200
                       lg:mt-0 mt-14"
          >
            <span aria-hidden="true">⚠ </span>
            Tenés un pago vencido hace{" "}
            <strong>{peorEstado.dias_mora} día{peorEstado.dias_mora !== 1 ? "s" : ""}</strong>.
            Tu servicio puede suspenderse.{" "}
            <Link href="/portal/pagos" className="underline font-semibold hover:text-white transition-colors">
              Regularizá ahora →
            </Link>
          </div>
        )}

        {/* Banner pago en revisión — azul */}
        {peorEstado.tipo === "PAYMENT_IN_REVIEW" && (
          <div
            role="status"
            className="bg-blue-900/60 border-b border-blue-700 px-4 py-2.5 text-center text-sm text-blue-200
                       lg:mt-0 mt-14"
          >
            <span aria-hidden="true">🔄 </span>
            Tu pago está siendo verificado. En breve se actualizará el estado de tu servicio.
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="portal-main flex-1 max-w-4xl mx-auto w-full px-4 py-8
                     pt-[calc(3.5rem+2rem)] lg:pt-8
                     pb-[calc(4.5rem+env(safe-area-inset-bottom)+1rem)] lg:pb-8"
        >
          {children}
        </main>

        {/* Footer solo en desktop — en mobile lo reemplaza el bottom nav */}
        <footer className="hidden lg:block bg-slate-800 border-t border-slate-700 px-4 py-4 text-sm text-slate-400 text-center">
          Escobar Instalaciones — Soporte:{" "}
          <a
            href="https://wa.me/5493436575372"
            className="text-orange-400 underline hover:text-orange-300"
          >
            343-657-5372
          </a>
        </footer>
      </div>
    </>
  );
}

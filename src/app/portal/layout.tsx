import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { calcularEstadoFinanciero, peorEstadoFinanciero } from "@/lib/billing-state";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { PagoRequeridoModal } from "@/components/portal/PagoRequeridoModal";
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
  // ── Auth guard (segunda línea de defensa, la primera es middleware.ts) ────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Billing state — consultar cuentas activas con pagos impagos ───────────────
  const cuentas = await prisma.cuenta.findMany({
    where: {
      perfil_id: user.id,
      estado: { not: "BAJA_DEFINITIVA" },
    },
    select: {
      id: true,
      estado: true,
      pagos: {
        where: { estado: { in: ["PENDIENTE", "VENCIDO", "PROCESANDO"] } },
        select: { estado: true, mes: true, anio: true, importe: true },
      },
    },
  });

  const estados = cuentas.map((c) =>
    calcularEstadoFinanciero(c.estado, c.pagos)
  );
  const peorEstado = peorEstadoFinanciero(estados);

  // Deuda total para el modal de suspensión
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
      {/* Skip-to-content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-lg focus:font-medium"
      >
        Ir al contenido principal
      </a>

      {/* Hard Paywall Modal — solo cuando el servicio está suspendido */}
      {peorEstado.tipo === "SUSPENDED" && (
        <PagoRequeridoModal deudaTotal={deudaTotal} />
      )}

      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/portal/dashboard"
              className="flex items-center gap-2 group"
            >
              <div className="h-8 w-8 bg-orange-500 rounded-md flex items-center justify-center text-white font-bold text-sm shadow shadow-orange-500/20 group-hover:scale-105 transition-transform">
                EI
              </div>
              <span className="text-base font-semibold text-white">Escobar Instalaciones</span>
            </Link>
            <nav aria-label="Navegación principal del portal">
              <ul className="flex gap-6 text-sm" role="list">
                <li>
                  <Link
                    href="/portal/dashboard"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Mis servicios
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/pagos"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Pagos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/solicitudes"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Asistencia
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/perfil"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Mi perfil
                  </Link>
                </li>
                <li>
                  <LogoutButton />
                </li>
              </ul>
            </nav>
          </div>
        </header>

        {/* Banner de mora — estado GRACE_PERIOD (ámbar sticky) */}
        {peorEstado.tipo === "GRACE_PERIOD" && (
          <div
            role="alert"
            className="bg-amber-900/80 border-b border-amber-700 px-4 py-2.5 text-center text-sm text-amber-200"
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

        {/* Banner de pago en revisión (azul) */}
        {peorEstado.tipo === "PAYMENT_IN_REVIEW" && (
          <div
            role="status"
            className="bg-blue-900/60 border-b border-blue-700 px-4 py-2.5 text-center text-sm text-blue-200"
          >
            <span aria-hidden="true">🔄 </span>
            Tu pago está siendo verificado. En breve se actualizará el estado de tu servicio.
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="portal-main flex-1 max-w-4xl mx-auto w-full px-4 py-8"
        >
          {children}
        </main>

        <footer className="bg-slate-800 border-t border-slate-700 px-4 py-4 text-sm text-slate-400 text-center">
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

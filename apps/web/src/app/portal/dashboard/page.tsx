import type { Metadata } from "next";
import Link from "next/link";
import {
  CreditCard, FileText, Zap, Wrench, ClipboardList, User,
  MessageCircle, ChevronRight, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { calcularEstadoFinanciero, peorEstadoFinanciero } from "@/lib/billing-state";
import { DIAS_GRACIA, DIAS_SUSPENSION } from "@/lib/constants/billing";
import { getParam } from "@/lib/parametros";
import { CuentaCard } from "@/components/portal/CuentaCard";
import { EstadoSistemaCard } from "@/components/portal/EstadoSistemaCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalSection } from "@/components/portal/PortalSection";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Inicio" };

export default async function DashboardPage() {
  const { userId, perfil } = await requireSesion();

  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: userId, estado: { not: "BAJA_DEFINITIVA" } },
    include: {
      sensores: { where: { alerta_mant: true }, select: { id: true } },
      pagos: {
        where: { estado: { in: ["PENDIENTE", "VENCIDO", "PROCESANDO"] } },
        select: { id: true, estado: true, importe: true, mes: true, anio: true },
      },
      // Para "visita técnica en gestión" en la tarjeta de estado del sistema.
      solicitudes: { where: { estado: { not: "RESUELTA" } }, select: { id: true } },
      ordenes_trabajo: {
        where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
        select: { id: true },
      },
    },
    orderBy: { descripcion: "asc" },
  });

  const [diasGracia, diasSuspension] = await Promise.all([
    getParam("DIAS_GRACIA", DIAS_GRACIA),
    getParam("DIAS_SUSPENSION", DIAS_SUSPENSION),
  ]);
  const configEstadoFinanciero = { diasGracia, diasSuspension };

  // Estado financiero para el chip de mora (refuerza el CTA de cobranza que
  // antes vivía en el banner del header). Reutiliza el query de cuentas/pagos.
  const peorEstado = peorEstadoFinanciero(
    cuentas.map((c) =>
      calcularEstadoFinanciero(c.estado, c.pagos, c.override_activo, c.override_expira, configEstadoFinanciero)
    )
  );

  const estadoSistema = cuentas.map((c) => ({
    id: c.id,
    descripcion: c.descripcion,
    sincronizada: c.sg_synced_at !== null,
    enFalloAc: c.sg_en_fallo_ac,
    falloAcDesde: c.sg_fallo_ac_desde,
    enFalloTst: c.sg_en_fallo_tst,
    falloTstDesde: c.sg_fallo_tst_desde,
    ultimoTst: c.sg_ultimo_tst,
    enGestion: c.solicitudes.length > 0 || c.ordenes_trabajo.length > 0,
  }));

  return (
    <section aria-labelledby="dashboard-heading" className="space-y-8">
      <div className="portal-welcome-panel">
        <div className="flex flex-col gap-5 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <PortalPageHeader
            eyebrow="Mi Central"
            title={`Hola, ${perfil.nombre.split(" ")[0]}`}
            titleId="dashboard-heading"
            description="Todo lo importante de tu servicio, claro y a mano."
          />
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            Acceso seguro
          </span>
        </div>

        <nav aria-label="Acciones rápidas" className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
          <Link href="/portal/solicitud" className="portal-quick-action portal-quick-action-primary">
            <Wrench aria-hidden="true" />
            <span>Asistencia</span>
          </Link>
          <Link href="/portal/pagos" className="portal-quick-action">
            <CreditCard aria-hidden="true" />
            <span>Pagos</span>
          </Link>
          <a href={siteConfig.contact.whatsappLink} target="_blank" rel="noopener noreferrer" className="portal-quick-action">
            <MessageCircle aria-hidden="true" />
            <span>Contacto</span>
          </a>
        </nav>
      </div>

      {peorEstado.tipo === "GRACE_PERIOD" && (
        <Link
          href="/portal/pagos"
          className="flex items-center gap-3 rounded-xl border border-tactical-500/30 bg-tactical-500/10 px-4 py-3 text-sm text-tactical-200 transition-colors hover:bg-tactical-500/15"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-tactical-400" strokeWidth={2} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            Tenés un pago vencido hace{" "}
            <strong className="font-bold">
              {peorEstado.dias_mora} día{peorEstado.dias_mora !== 1 ? "s" : ""}
            </strong>
            . Tu servicio puede suspenderse.
          </span>
          <span className="flex-shrink-0 font-bold text-tactical-300">Regularizá →</span>
        </Link>
      )}

      <EstadoSistemaCard cuentas={estadoSistema} />

      <PortalSection title="Mis instalaciones" meta={cuentas.length || undefined}>
        {cuentas.length === 0 ? (
          <div className="portal-panel p-7 text-center">
            <p className="mb-4 text-sm text-slate-400">No tenés servicios activos.</p>
            <a href={siteConfig.contact.whatsappLink} className="portal-action portal-action-primary">
              Contactar a Escobar Instalaciones
            </a>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" role="list">
            {cuentas.map((cuenta) => (
              <li key={cuenta.id} className="min-w-0">
                <CuentaCard cuenta={cuenta} config={configEstadoFinanciero} />
              </li>
            ))}
          </ul>
        )}
      </PortalSection>

      <PortalSection title="Más opciones">
      <nav aria-label="Acciones principales">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(
            [
              { href: "/portal/documentos",  label: "Documentos",        icon: FileText },
              { href: "/portal/eventos",     label: "Eventos",           icon: Zap },
              { href: "/portal/solicitudes", label: "Mis solicitudes",   icon: ClipboardList },
              { href: "/portal/perfil",      label: "Mi perfil",         icon: User },
            ] satisfies { href: string; label: string; icon: LucideIcon }[]
          ).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-[52px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              <Icon
                aria-hidden="true"
                className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover:text-tactical-400"
                strokeWidth={1.8}
              />
              <span className="font-medium leading-tight">{label}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </nav>
      </PortalSection>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  CreditCard, FileText, Zap, Wrench, ClipboardList, User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { CuentaCard } from "@/components/portal/CuentaCard";
import { EstadoSistemaCard } from "@/components/portal/EstadoSistemaCard";
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
    <section aria-labelledby="dashboard-heading">
      {/* Encabezado — identidad del operador */}
      <div className="mb-8 pb-5 border-b border-industrial-700">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-led-idle flex-shrink-0" aria-hidden="true" />
          <span className="text-xs text-slate-400 font-mono tracking-widest uppercase">Central activa</span>
        </div>
        <h1 id="dashboard-heading" className="text-2xl font-display font-bold text-white">
          Hola, {perfil.nombre.split(" ")[0]}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Estado de tu cuenta y servicios contratados con Escobar Instalaciones
        </p>
      </div>

      <EstadoSistemaCard cuentas={estadoSistema} />

      {cuentas.length === 0 ? (
        <div className="bg-industrial-800 rounded-lg border border-industrial-700 p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <p className="text-slate-400 mb-5 text-sm">No tenés servicios activos.</p>
          <a
            href={siteConfig.contact.whatsappLink}
            className="inline-flex items-center gap-2 bg-tactical-500 hover:bg-tactical-400
                       text-slate-900 px-6 py-3 rounded-sm font-bold uppercase text-xs tracking-widest
                       border border-tactical-600 border-b-[4px] border-b-tactical-600
                       transition-all duration-150 ease-mech-press
                       active:border-b-[1px] active:translate-y-[3px] min-h-[44px]"
          >
            Contactar Escobar Instalaciones
          </a>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" role="list">
          {cuentas.map((cuenta) => (
            // min-w-0: sin esto el truncate del título infla el min-content
            // del grid item y desborda el viewport en mobile (grid blowout)
            <li key={cuenta.id} className="min-w-0">
              <CuentaCard cuenta={cuenta} />
            </li>
          ))}
        </ul>
      )}

      {/* Acciones rápidas */}
      <nav aria-label="Accesos rápidos" className="mt-8 pt-6 border-t border-industrial-700/50">
        <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mb-3">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(
            [
              { href: "/portal/pagos",       label: "Mis pagos",         icon: CreditCard },
              { href: "/portal/documentos",  label: "Documentos",        icon: FileText },
              { href: "/portal/eventos",     label: "Eventos",           icon: Zap },
              { href: "/portal/solicitud",   label: "Reportar problema", icon: Wrench },
              { href: "/portal/solicitudes", label: "Mis solicitudes",   icon: ClipboardList },
              { href: "/portal/perfil",      label: "Mi perfil",         icon: User },
            ] satisfies { href: string; label: string; icon: LucideIcon }[]
          ).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg border border-industrial-700 bg-industrial-800/60 hover:bg-industrial-800 hover:border-industrial-600 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors min-h-[44px] group"
            >
              <Icon
                aria-hidden="true"
                className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-tactical-400 transition-colors"
                strokeWidth={1.8}
              />
              <span className="font-medium leading-tight">{label}</span>
              <span className="text-slate-700 group-hover:text-slate-500 ml-auto text-xs" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}

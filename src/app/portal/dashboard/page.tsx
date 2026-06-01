import type { Metadata } from "next";
import Link from "next/link";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { CuentaCard } from "@/components/portal/CuentaCard";
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
    },
    orderBy: { descripcion: "asc" },
  });

  return (
    <section aria-labelledby="dashboard-heading">
      {/* Encabezado — identidad del operador */}
      <div className="mb-8 pb-5 border-b border-industrial-700">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-led-idle flex-shrink-0" aria-hidden="true" />
          <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Portal activo</span>
        </div>
        <h1 id="dashboard-heading" className="text-2xl font-bold text-white">
          Hola, {perfil.nombre.split(" ")[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Servicios contratados con Escobar Instalaciones
        </p>
      </div>

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
            <li key={cuenta.id}>
              <CuentaCard cuenta={cuenta} />
            </li>
          ))}
        </ul>
      )}

      {/* Acciones rápidas */}
      <nav aria-label="Accesos rápidos" className="mt-8 pt-6 border-t border-industrial-700/50">
        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-3">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { href: "/portal/pagos",       label: "Mis pagos",        icon: "💳" },
            { href: "/portal/facturas",    label: "Facturas",         icon: "📄" },
            { href: "/portal/eventos",     label: "Eventos",          icon: "⚡" },
            { href: "/portal/solicitud",   label: "Reportar problema",icon: "🔧" },
            { href: "/portal/solicitudes", label: "Mis solicitudes",  icon: "📋" },
            { href: "/portal/perfil",      label: "Mi perfil",        icon: "👤" },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg border border-industrial-700 bg-industrial-800/60 hover:bg-industrial-800 hover:border-industrial-600 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors min-h-[44px] group"
            >
              <span aria-hidden="true" className="text-base leading-none">{icon}</span>
              <span className="font-medium leading-tight">{label}</span>
              <span className="text-slate-700 group-hover:text-slate-500 ml-auto text-xs" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}

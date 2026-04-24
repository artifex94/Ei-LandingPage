import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { CuentaCard } from "@/components/portal/CuentaCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (!perfil) redirect("/login");

  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: user.id, estado: { not: "BAJA_DEFINITIVA" } },
    include: {
      sensores: { where: { alerta_mant: true }, select: { id: true } },
      pagos: {
        where: {
          anio: new Date().getFullYear(),
          mes: new Date().getMonth() + 1,
          estado: { in: ["PENDIENTE", "VENCIDO"] },
        },
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
          <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Portal activo</span>
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
            href="https://wa.me/5493436575372"
            className="inline-flex items-center gap-2 bg-tactical-500 hover:bg-tactical-400
                       text-white px-6 py-3 rounded-sm font-bold uppercase text-xs tracking-widest
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

      <div className="mt-8 pt-4 border-t border-industrial-700/50">
        <Link
          href="/portal/pagos"
          className="inline-flex items-center gap-2 text-tactical-500 hover:text-tactical-400
                     font-bold uppercase text-xs tracking-widest font-mono
                     transition-colors min-h-[44px]"
        >
          Ver historial de pagos <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

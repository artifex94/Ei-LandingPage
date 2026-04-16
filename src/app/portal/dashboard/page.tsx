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
      <h1 id="dashboard-heading" className="text-2xl font-bold text-white mb-2">
        Hola, {perfil.nombre.split(" ")[0]}
      </h1>
      <p className="text-slate-400 mb-8">
        Tus servicios contratados con Escobar Instalaciones.
      </p>

      {cuentas.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <p className="text-slate-300 mb-4">No tenés servicios activos.</p>
          <a
            href="https://wa.me/5493436575372"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium min-h-[44px] transition-colors"
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

      <div className="mt-8">
        <Link
          href="/portal/pagos"
          className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium hover:underline min-h-[44px] transition-colors"
        >
          Ver historial de pagos →
        </Link>
      </div>
    </section>
  );
}

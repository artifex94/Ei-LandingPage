import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

function estadoCuentaBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVA: { bg: "bg-green-900/40", text: "text-green-400", label: "Activa" },
    SUSPENDIDA_PAGO: { bg: "bg-red-900/40", text: "text-red-400", label: "Suspendida" },
    EN_MANTENIMIENTO: { bg: "bg-yellow-900/40", text: "text-yellow-400", label: "En mantenimiento" },
    BAJA_DEFINITIVA: { bg: "bg-slate-700", text: "text-slate-400", label: "Baja" },
  };
  return map[estado] ?? { bg: "bg-slate-700", text: "text-slate-400", label: estado };
}

const CATEGORIA_LABELS: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma y monitoreo",
  DOMOTICA: "Domótica",
  CAMARA_CCTV: "Cámaras CCTV",
  ANTENA_STARLINK: "Antena StarLink",
  OTRO: "Otro",
};

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
        select: { id: true, estado: true, importe: true },
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
          {cuentas.map((cuenta) => {
            const badge = estadoCuentaBadge(cuenta.estado);
            const tienePagoVencido = cuenta.pagos.some((p) => p.estado === "VENCIDO");
            const tienePagoPendiente = cuenta.pagos.some((p) => p.estado === "PENDIENTE");
            const tieneAlerta = cuenta.sensores.length > 0;

            return (
              <li key={cuenta.id}>
                <Link
                  href={`/portal/cuentas/${cuenta.id}`}
                  className="block bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-orange-500 hover:bg-slate-800/80 transition-all group"
                  aria-label={`Ver detalle de ${cuenta.descripcion} — ${badge.label}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="font-semibold text-white text-lg leading-snug group-hover:text-orange-400 transition-colors">
                      {cuenta.descripcion}
                    </h2>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 mb-4">
                    {CATEGORIA_LABELS[cuenta.categoria] ?? cuenta.categoria}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {tienePagoVencido && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-900/40 px-2 py-1 rounded-full">
                        ⚠ Pago vencido
                      </span>
                    )}
                    {tienePagoPendiente && !tienePagoVencido && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-900/40 px-2 py-1 rounded-full">
                        ○ Pago pendiente
                      </span>
                    )}
                    {tieneAlerta && (
                      <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-900/40 px-2 py-1 rounded-full">
                        ⚠ Mantenimiento
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
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

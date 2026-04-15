import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { CalendarioPagos, type PagoPlano } from "@/components/portal/CalendarioPagos";
import { BannerDeudaTotal } from "@/components/portal/BannerDeudaTotal";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const anioActual = new Date().getFullYear();
  const anio = Number(sp.anio) || anioActual;

  // Años con pagos registrados para este usuario
  const aniosRaw = await prisma.pago.findMany({
    where: { cuenta: { perfil_id: user.id } },
    select: { anio: true },
    distinct: ["anio"],
    orderBy: { anio: "desc" },
  });

  const aniosDisponibles = [...new Set([
    anioActual,
    ...aniosRaw.map((r) => r.anio),
  ])].sort((a, b) => b - a);

  // Cuentas activas con pagos del año seleccionado
  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: user.id, estado: { not: "BAJA_DEFINITIVA" } },
    include: {
      pagos: {
        where: { anio },
        orderBy: { mes: "asc" },
      },
    },
    orderBy: { descripcion: "asc" },
  });

  // Calcular deudas pendientes/vencidas del año seleccionado
  const deudas: { pago: PagoPlano; descripcionCuenta: string }[] = [];
  for (const cuenta of cuentas) {
    for (const p of cuenta.pagos) {
      if (p.estado === "PENDIENTE" || p.estado === "VENCIDO") {
        deudas.push({
          pago: { ...p, importe: Number(p.importe) },
          descripcionCuenta: cuenta.descripcion,
        });
      }
    }
  }

  return (
    <section aria-labelledby="pagos-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 id="pagos-heading" className="text-2xl font-bold text-white">
          Historial de pagos
        </h1>

        {/* Selector de año */}
        {aniosDisponibles.length > 1 && (
          <form method="GET">
            <label htmlFor="anio-select" className="sr-only">Seleccionar año</label>
            <div className="flex items-center gap-2">
              <select
                id="anio-select"
                name="anio"
                defaultValue={anio}
                className="bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-base min-h-[52px] focus:outline-2 focus:outline-orange-500"
                aria-label="Año a consultar"
              >
                {aniosDisponibles.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-5 py-3 rounded-xl text-base min-h-[52px] transition-colors font-semibold"
              >
                Ver
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Banner de deuda total — solo para el año actual */}
      {anio === anioActual && deudas.length > 0 && (
        <div className="mb-8">
          <BannerDeudaTotal deudas={deudas} />
        </div>
      )}

      {cuentas.length === 0 ? (
        <p className="text-slate-400 text-lg">No tenés servicios activos.</p>
      ) : (
        <div className="space-y-10">
          {cuentas.map((cuenta) => (
            <div key={cuenta.id}>
              <h2 className="text-lg font-semibold text-white mb-4">
                {cuenta.descripcion}
              </h2>
              <CalendarioPagos
                pagos={cuenta.pagos.map((p) => ({ ...p, importe: Number(p.importe) }))}
                anio={anio}
                cuentaId={cuenta.id}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

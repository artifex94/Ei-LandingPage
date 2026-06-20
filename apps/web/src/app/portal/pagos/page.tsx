import type { Metadata } from "next";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { CalendarioPagos, type PagoPlano } from "@/components/portal/CalendarioPagos";
import { BannerDeudaTotal } from "@/components/portal/BannerDeudaTotal";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import Select from "@/components/ui/Select";

export const metadata: Metadata = { title: "Mis pagos" };

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const { userId: user_id } = await requireSesion();

  const sp = await searchParams;
  const anioActual = new Date().getFullYear();
  const anio = Number(sp.anio) || anioActual;

  const [aniosRaw, cuentas] = await Promise.all([
    // Años con pagos registrados para este usuario
    prisma.pago.findMany({
      where: { cuenta: { perfil_id: user_id } },
      select: { anio: true },
      distinct: ["anio"],
      orderBy: { anio: "desc" },
    }),
    // Cuentas activas con pagos del año seleccionado
    prisma.cuenta.findMany({
      where: { perfil_id: user_id, estado: { not: "BAJA_DEFINITIVA" } },
      include: {
        pagos: {
          where: { anio },
          orderBy: { mes: "asc" },
        },
      },
      orderBy: { descripcion: "asc" },
    }),
  ]);

  const aniosDisponibles = [...new Set([
    anioActual,
    ...aniosRaw.map((r) => r.anio),
  ])].sort((a, b) => b - a);

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
      <div className="mb-6">
        <PortalPageHeader
          eyebrow="Mi Central"
          title="Mis pagos"
          titleId="pagos-heading"
          description="Consultá vencimientos, comprobantes y pagos anteriores."
          action={
            aniosDisponibles.length > 1 ? (
              <form method="GET">
                <label htmlFor="anio-select" className="sr-only">Seleccionar año</label>
                <div className="flex items-center gap-2">
                  <div className="w-28">
                    <Select
                      id="anio-select"
                      name="anio"
                      defaultValue={anio}
                      aria-label="Año a consultar"
                    >
                      {aniosDisponibles.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="submit"
                    className="portal-action"
                  >
                    Ver
                  </button>
                </div>
              </form>
            ) : undefined
          }
        />
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
        <div className="space-y-8">
          {cuentas.map((cuenta) => (
            <div key={cuenta.id}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-lg font-semibold text-white">
                  {cuenta.descripcion}
                </h2>
                <span className="hidden text-xs text-slate-500 sm:inline">
                  {anio}
                </span>
              </div>
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

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { CalendarioPagos } from "@/components/portal/CalendarioPagos";

export default async function PagosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const anio = new Date().getFullYear();

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

  return (
    <section aria-labelledby="pagos-heading">
      <h1 id="pagos-heading" className="text-2xl font-bold text-white mb-2">
        Historial de pagos
      </h1>
      <p className="text-slate-400 mb-8">Año {anio}</p>

      {cuentas.length === 0 ? (
        <p className="text-slate-400">No tenés servicios activos.</p>
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

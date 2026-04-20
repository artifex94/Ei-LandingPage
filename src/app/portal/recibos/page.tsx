import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const metadata: Metadata = { title: "Mis Recibos — Portal" };

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const METODO_LABEL: Record<string, string> = {
  MERCADOPAGO:          "MercadoPago",
  TALO_CVU:             "Transferencia CVU",
  EFECTIVO:             "Efectivo",
  CHEQUE:               "Cheque",
  TRANSFERENCIA_BANCARIA: "Transferencia bancaria",
};

export default async function RecibosPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pagos = await prisma.pago.findMany({
    where: {
      estado: "PAGADO",
      cuenta: { perfil_id: user.id },
    },
    include: {
      cuenta: { select: { descripcion: true } },
    },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis recibos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Comprobantes de pago de todos tus servicios.
        </p>
      </div>

      {pagos.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
          <p className="text-slate-400">No hay pagos registrados todavía.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Período</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Servicio</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Importe</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {pagos.map((p) => (
                <tr key={p.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-white capitalize">
                    {MESES_ES[p.mes - 1]} {p.anio}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {p.cuenta.descripcion}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    ${Number(p.importe).toLocaleString("es-AR")}
                    {p.metodo && (
                      <span className="block text-xs font-normal text-slate-500">
                        {METODO_LABEL[p.metodo] ?? p.metodo}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/recibo/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      aria-label={`Ver recibo de ${MESES_ES[p.mes - 1]} ${p.anio}`}
                    >
                      Ver recibo ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

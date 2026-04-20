import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const metadata: Metadata = { title: "Mis Facturas — Portal" };

export default async function FacturasPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const facturas = await prisma.factura.findMany({
    where: {
      perfil_id: user.id,
      estado:    { in: ["EMITIDA_MANUAL", "EMITIDA_WSFE"] },
    },
    orderBy: { periodo_desde: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis facturas</h1>
        <p className="text-sm text-slate-400 mt-1">
          Facturas emitidas por Escobar Instalaciones disponibles para descarga.
        </p>
      </div>

      {facturas.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
          <p className="text-slate-400">No hay facturas disponibles todavía.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Período</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Nº</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {facturas.map((f) => (
                <tr key={f.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-white capitalize">
                    {new Date(f.periodo_desde).toLocaleDateString("es-AR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {f.numero_oficial ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    ${Number(f.total).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {f.pdf_url ? (
                      <a
                        href={f.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        aria-label={`Descargar factura de ${new Date(f.periodo_desde).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`}
                      >
                        Descargar PDF ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Próximamente</span>
                    )}
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

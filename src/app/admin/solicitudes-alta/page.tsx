import { prisma } from "@/lib/prisma/client";
import { AltaUsuarioRow } from "./AltaUsuarioRow";

export const metadata = { title: "Altas de usuario — Admin" };

export default async function SolicitudesAltaPage() {
  const solicitudes = await prisma.altaUsuario.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Solicitudes de alta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Clientes que solicitaron acceso al portal
        </p>
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <p className="text-slate-500 text-sm">No hay solicitudes de alta por el momento.</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    DNI
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {solicitudes.map((solicitud) => (
                  <AltaUsuarioRow key={solicitud.id} solicitud={solicitud} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

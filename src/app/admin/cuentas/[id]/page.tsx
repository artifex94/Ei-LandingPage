import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { ActualizarCuentaForm } from "@/components/admin/ActualizarCuentaForm";
import { GestionSensores } from "@/components/admin/GestionSensores";
import { NuevaSolicitudForm } from "@/components/admin/NuevaSolicitudForm";
import { OverrideSuspensionForm } from "@/components/admin/OverrideSuspensionForm";

const MESES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ESTADO_PAGO_COLORES: Record<string, string> = {
  PAGADO: "bg-green-900/40 text-green-400",
  VENCIDO: "bg-orange-900/40 text-orange-400",
  PROCESANDO: "bg-blue-900/40 text-blue-400",
  PENDIENTE: "bg-amber-900/40 text-amber-400",
};

export default async function CuentaAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cuenta = await prisma.cuenta.findUnique({
    where: { id },
    include: {
      perfil: { select: { id: true, nombre: true, telefono: true } },
      sensores: { orderBy: { codigo_zona: "asc" } },
      solicitudes: {
        where: { estado: { not: "RESUELTA" } },
        orderBy: { creada_en: "desc" },
      },
      pagos: {
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
        take: 12,
      },
    },
  });

  if (!cuenta) notFound();

  return (
    <div className="space-y-8 max-w-3xl">
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/cuentas" className="hover:text-white transition-colors">
              Cuentas
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium truncate max-w-xs">{cuenta.descripcion}</li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-white">{cuenta.descripcion}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <p className="text-sm text-slate-400">
            Cliente:{" "}
            <Link
              href={`/admin/clientes/${cuenta.perfil.id}`}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              {cuenta.perfil.nombre}
            </Link>
            {" · "}Ref: <span className="font-mono">{cuenta.softguard_ref}</span>
          </p>
          {cuenta.perfil.telefono && (
            <a
              href={`https://wa.me/${cuenta.perfil.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${cuenta.perfil.nombre.split(" ")[0]}, te contactamos por el servicio "${cuenta.descripcion}" de Escobar Instalaciones.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <span aria-hidden="true">📱</span>
              WhatsApp
            </a>
          )}
          <Link
            href={`/admin/vista-cliente/${cuenta.perfil.id}?tab=cuenta&cuentaId=${cuenta.id}`}
            className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
            title="Ver esta cuenta exactamente como la ve el cliente"
          >
            Ver portal del cliente
          </Link>
        </div>
      </div>

      {/* Editar cuenta */}
      <section aria-labelledby="editar-heading">
        <h2 id="editar-heading" className="text-lg font-semibold text-white mb-4">
          Datos de la cuenta
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <ActualizarCuentaForm cuenta={{
            id: cuenta.id,
            descripcion: cuenta.descripcion,
            categoria: cuenta.categoria,
            estado: cuenta.estado,
            costo_mensual: Number(cuenta.costo_mensual),
            calle: cuenta.calle,
            localidad: cuenta.localidad,
            provincia: cuenta.provincia,
            codigo_postal: cuenta.codigo_postal,
            notas_tecnicas: cuenta.notas_tecnicas,
          }} />
        </div>
      </section>

      {/* Gestión de sensores */}
      <section aria-labelledby="sensores-heading">
        <h2 id="sensores-heading" className="text-lg font-semibold text-white mb-4">
          Sensores ({cuenta.sensores.length})
        </h2>
        <GestionSensores
          sensores={cuenta.sensores.map((s) => ({
            id: s.id,
            codigo_zona: s.codigo_zona,
            etiqueta: s.etiqueta,
            tipo: s.tipo,
            activa: s.activa,
            bateria: s.bateria,
          }))}
          cuentaId={cuenta.id}
        />
      </section>

      {/* Override de suspensión — solo si la cuenta está suspendida */}
      {(cuenta.estado === "SUSPENDIDA_PAGO" || cuenta.override_activo) && (
        <section aria-labelledby="override-heading">
          <h2 id="override-heading" className="text-lg font-semibold text-white mb-4">
            Gestión de suspensión
          </h2>
          <OverrideSuspensionForm
            cuentaId={cuenta.id}
            overrideActivo={cuenta.override_activo}
            overrideExpira={cuenta.override_expira?.toISOString() ?? null}
          />
        </section>
      )}

      {/* Solicitudes de mantenimiento */}
      <section aria-labelledby="solicitudes-heading">
        <h2 id="solicitudes-heading" className="text-lg font-semibold text-white mb-4">
          Solicitudes de mantenimiento{cuenta.solicitudes.length > 0 ? ` (${cuenta.solicitudes.length} abiertas)` : ""}
        </h2>

        {cuenta.solicitudes.length > 0 && (
          <ul className="space-y-3 mb-4">
            {cuenta.solicitudes.map((s) => (
              <li
                key={s.id}
                className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-200">{s.descripcion}</p>
                  <span className="text-xs font-semibold bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                    {s.prioridad}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(s.creada_en).toLocaleDateString("es-AR")}
                </p>
              </li>
            ))}
          </ul>
        )}

        <NuevaSolicitudForm cuentaId={cuenta.id} />
      </section>

      {/* Últimos 12 pagos */}
      {cuenta.pagos.length > 0 && (
        <section aria-labelledby="pagos-heading">
          <h2 id="pagos-heading" className="text-lg font-semibold text-white mb-4">
            Últimos pagos
          </h2>
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Período</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Estado</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Importe</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Método</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {cuenta.pagos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-2 text-slate-300">
                      {MESES[p.mes]} {p.anio}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          ESTADO_PAGO_COLORES[p.estado] ?? "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white font-medium">
                      ${Number(p.importe).toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {p.metodo ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {p.registrado_por ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

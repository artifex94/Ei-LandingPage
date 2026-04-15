import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { ActualizarCuentaForm } from "@/components/admin/ActualizarCuentaForm";

export default async function CuentaAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cuenta = await prisma.cuenta.findUnique({
    where: { id },
    include: {
      perfil: true,
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

  const TIPO_LABELS: Record<string, string> = {
    SENSOR_PIR: "Movimiento PIR",
    CONTACTO_MAGNETICO: "Contacto magnético",
    CAMARA_IP: "Cámara IP",
    TECLADO_CONTROL: "Teclado",
    DETECTOR_HUMO: "Detector de humo",
    MODULO_DOMOTICA: "Módulo domótica",
    PANICO: "Botón de pánico",
  };

  const BATERIA_LABELS: Record<string, string> = {
    OPTIMA: "✓ Óptima",
    ADVERTENCIA: "⚠ Baja",
    CRITICA: "● Crítica",
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li><Link href="/admin/cuentas" className="hover:text-white transition-colors">Cuentas</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium truncate max-w-xs">{cuenta.descripcion}</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-white">{cuenta.descripcion}</h1>

      {/* Editar cuenta */}
      <section aria-labelledby="editar-heading">
        <h2 id="editar-heading" className="text-lg font-semibold text-white mb-4">
          Datos de la cuenta
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <ActualizarCuentaForm cuenta={cuenta} />
        </div>
      </section>

      {/* Sensores */}
      <section aria-labelledby="sensores-heading">
        <h2 id="sensores-heading" className="text-lg font-semibold text-white mb-4">
          Sensores ({cuenta.sensores.length})
        </h2>
        {cuenta.sensores.length === 0 ? (
          <p className="text-slate-400 text-sm">Sin sensores registrados.</p>
        ) : (
          <>
            {/* ── Tabla — desktop ────────────────────────────────────────────── */}
            <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-slate-300">Zona</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-300">Etiqueta</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-300">Tipo</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-300">Batería</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-300">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {cuenta.sensores.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-2 text-slate-400 font-mono text-xs">{s.codigo_zona}</td>
                      <td className="px-4 py-2 font-medium text-white">{s.etiqueta}</td>
                      <td className="px-4 py-2 text-slate-300">{TIPO_LABELS[s.tipo] ?? s.tipo}</td>
                      <td className="px-4 py-2 text-slate-300">{s.bateria ? BATERIA_LABELS[s.bateria] : "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.activa ? "bg-green-900/40 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                          {s.activa ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Cards — mobile ──────────────────────────────────────────────── */}
            <div className="md:hidden space-y-2">
              {cuenta.sensores.map((s) => (
                <div key={s.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{s.etiqueta}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {TIPO_LABELS[s.tipo] ?? s.tipo} · <span className="font-mono">{s.codigo_zona}</span>
                      </p>
                      {s.bateria && (
                        <p className="text-xs text-slate-400 mt-0.5">{BATERIA_LABELS[s.bateria]}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${s.activa ? "bg-green-900/40 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                      {s.activa ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Solicitudes abiertas */}
      {cuenta.solicitudes.length > 0 && (
        <section aria-labelledby="solicitudes-heading">
          <h2 id="solicitudes-heading" className="text-lg font-semibold text-white mb-4">
            Solicitudes abiertas
          </h2>
          <ul className="space-y-3">
            {cuenta.solicitudes.map((s) => (
              <li key={s.id} className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4">
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
        </section>
      )}
    </div>
  );
}

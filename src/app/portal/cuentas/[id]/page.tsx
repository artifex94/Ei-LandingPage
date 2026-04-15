import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const TIPO_SENSOR_LABELS: Record<string, string> = {
  SENSOR_PIR: "Sensor de movimiento",
  CONTACTO_MAGNETICO: "Contacto magnético",
  CAMARA_IP: "Cámara IP",
  TECLADO_CONTROL: "Teclado de control",
  DETECTOR_HUMO: "Detector de humo",
  MODULO_DOMOTICA: "Módulo domótica",
  PANICO: "Botón de pánico",
};

const BATERIA_CONFIG: Record<string, { icon: string; text: string; color: string }> = {
  OPTIMA: { icon: "●●●", text: "Batería óptima", color: "text-green-400" },
  ADVERTENCIA: { icon: "●●○", text: "Batería baja", color: "text-yellow-400" },
  CRITICA: { icon: "●○○", text: "Batería crítica", color: "text-red-400" },
};

export default async function CuentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cuenta = await prisma.cuenta.findFirst({
    where: { id, perfil_id: user.id },
    include: {
      sensores: { orderBy: { codigo_zona: "asc" } },
      pagos: {
        where: { anio: new Date().getFullYear() },
        orderBy: { mes: "desc" },
      },
      solicitudes: {
        where: { estado: { not: "RESUELTA" } },
        orderBy: { creada_en: "desc" },
        take: 3,
      },
    },
  });

  if (!cuenta) notFound();

  const pagoPendiente = cuenta.pagos.find(
    (p) => p.estado === "PENDIENTE" || p.estado === "VENCIDO"
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/portal/dashboard" className="hover:text-white min-h-[44px] inline-flex items-center transition-colors">
              Mis servicios
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium truncate max-w-[200px]">
            {cuenta.descripcion}
          </li>
        </ol>
      </nav>

      {/* Encabezado */}
      <section aria-labelledby="cuenta-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 id="cuenta-heading" className="text-2xl font-bold text-white">
              {cuenta.descripcion}
            </h1>
            <p className="text-slate-400 mt-1">
              Ref. Softguard: {cuenta.softguard_ref}
            </p>
          </div>

          {pagoPendiente && (
            <Link
              href="/portal/pagos"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-semibold min-h-[48px] text-sm transition-colors"
            >
              ⚠ Pagar ahora — ${Number(pagoPendiente.importe).toLocaleString("es-AR")}
            </Link>
          )}
        </div>
      </section>

      {/* Sensores */}
      <section aria-labelledby="sensores-heading">
        <h2 id="sensores-heading" className="text-lg font-semibold text-white mb-4">
          Dispositivos instalados
        </h2>

        {cuenta.sensores.length === 0 ? (
          <p className="text-slate-400">No hay dispositivos registrados.</p>
        ) : (
          <ul className="space-y-3" role="list" aria-label="Lista de sensores">
            {cuenta.sensores.map((sensor) => {
              const batCfg = sensor.bateria ? BATERIA_CONFIG[sensor.bateria] : null;

              return (
                <li
                  key={sensor.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-white">{sensor.etiqueta}</p>
                    <p className="text-sm text-slate-400">
                      {TIPO_SENSOR_LABELS[sensor.tipo] ?? sensor.tipo} · {sensor.codigo_zona}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {batCfg && (
                      <span
                        className={`text-sm font-medium ${batCfg.color}`}
                        aria-label={batCfg.text}
                        title={batCfg.text}
                      >
                        {batCfg.icon}
                      </span>
                    )}
                    {sensor.alerta_mant && (
                      <span className="text-xs bg-yellow-900/40 text-yellow-400 font-medium px-2 py-1 rounded-full">
                        Mantenimiento
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        sensor.activa
                          ? "bg-green-900/40 text-green-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {sensor.activa ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Solicitar mantenimiento */}
      <section aria-labelledby="mant-heading">
        <h2 id="mant-heading" className="text-lg font-semibold text-white mb-4">
          ¿Algo no funciona bien?
        </h2>
        <Link
          href={`/portal/solicitud?cuenta=${cuenta.id}`}
          className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium min-h-[48px] border border-slate-600 transition-colors"
        >
          Solicitar asistencia técnica
        </Link>
      </section>
    </div>
  );
}

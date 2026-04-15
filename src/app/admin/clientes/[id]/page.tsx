import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { PagoManualForm } from "@/components/admin/PagoManualForm";

const ESTADO_CUENTA: Record<string, string> = {
  ACTIVA: "Activa",
  SUSPENDIDA_PAGO: "Suspendida por pago",
  EN_MANTENIMIENTO: "En mantenimiento",
  BAJA_DEFINITIVA: "Baja definitiva",
};

const CATEGORIA: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma y monitoreo",
  DOMOTICA: "Domótica",
  CAMARA_CCTV: "Cámaras CCTV",
  ANTENA_STARLINK: "Antena StarLink",
  OTRO: "Otro",
};

const ESTADO_PAGO_COLORES: Record<string, string> = {
  PAGADO: "bg-green-900/40 text-green-400",
  VENCIDO: "bg-red-900/40 text-red-400",
  PROCESANDO: "bg-blue-900/40 text-blue-400",
  PENDIENTE: "bg-amber-900/40 text-amber-400",
};

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const perfil = await prisma.perfil.findUnique({
    where: { id },
    include: {
      cuentas: {
        include: {
          pagos: {
            where: { anio: new Date().getFullYear() },
            orderBy: { mes: "asc" },
          },
          solicitudes: {
            where: { estado: { not: "RESUELTA" } },
            orderBy: { creada_en: "desc" },
          },
        },
        orderBy: { descripcion: "asc" },
      },
    },
  });

  if (!perfil) notFound();

  const anio = new Date().getFullYear();
  const mes = new Date().getMonth() + 1;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/clientes" className="hover:text-white transition-colors">
              Clientes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium">{perfil.nombre}</li>
        </ol>
      </nav>

      {/* Datos del perfil */}
      <section aria-labelledby="perfil-heading">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 id="perfil-heading" className="text-2xl font-bold text-white">
            {perfil.nombre}
          </h1>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              perfil.activo
                ? "bg-green-900/40 text-green-400"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {perfil.activo ? "Activo" : "Inactivo"}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "DNI", value: perfil.dni ?? "—" },
            { label: "Teléfono", value: perfil.telefono ?? "—" },
            { label: "Rol", value: perfil.rol },
            {
              label: "Alta",
              value: new Date(perfil.created_at).toLocaleDateString("es-AR"),
            },
          ].map((item) => (
            <div key={item.label} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
              <dt className="text-xs font-medium text-slate-400 mb-1">{item.label}</dt>
              <dd className="font-semibold text-white">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Cuentas */}
      <section aria-labelledby="cuentas-heading">
        <h2 id="cuentas-heading" className="text-lg font-semibold text-white mb-4">
          Cuentas ({perfil.cuentas.length})
        </h2>

        {perfil.cuentas.length === 0 ? (
          <p className="text-slate-400 text-sm">Sin cuentas registradas.</p>
        ) : (
          <div className="space-y-4">
            {perfil.cuentas.map((cuenta) => {
              const pagoEsteMes = cuenta.pagos.find((p) => p.mes === mes);
              const solicitudesAbiertas = cuenta.solicitudes.length;

              return (
                <div
                  key={cuenta.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-white">
                        {cuenta.descripcion}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {CATEGORIA[cuenta.categoria]} · Ref: {cuenta.softguard_ref}
                      </p>
                    </div>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-medium shrink-0">
                      {ESTADO_CUENTA[cuenta.estado] ?? cuenta.estado}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <span className="text-slate-400">
                      Tarifa mensual:{" "}
                      <strong className="text-white">
                        ${Number(cuenta.costo_mensual).toLocaleString("es-AR")}
                      </strong>
                    </span>
                    {solicitudesAbiertas > 0 && (
                      <span className="text-yellow-400 font-medium">
                        {solicitudesAbiertas} solicitud(es) abierta(s)
                      </span>
                    )}
                  </div>

                  {/* Pago del mes actual */}
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      Pago {mes}/{anio}
                    </p>
                    {pagoEsteMes ? (
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${ESTADO_PAGO_COLORES[pagoEsteMes.estado] ?? "bg-slate-700 text-slate-300"}`}>
                          {pagoEsteMes.estado}
                        </span>
                        <span className="text-sm text-slate-300">
                          ${Number(pagoEsteMes.importe).toLocaleString("es-AR")}
                        </span>
                      </div>
                    ) : (
                      <PagoManualForm
                        cuentaId={cuenta.id}
                        mes={mes}
                        anio={anio}
                        importe={Number(cuenta.costo_mensual)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

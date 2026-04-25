import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { PagoManualForm } from "@/components/admin/PagoManualForm";
import { EditarClienteForm } from "@/components/admin/EditarClienteForm";
import { NuevaCuentaForm } from "@/components/admin/NuevaCuentaForm";
import { EliminarClienteForm } from "@/components/admin/EliminarClienteForm";
import { AprobarButton, RechazarForm, EditarYAprobarForm } from "@/app/admin/solicitudes-cambio/AccionesForm";

const ESTADO_CUENTA: Record<string, string> = {
  ACTIVA: "Activa",
  SUSPENDIDA_PAGO: "Suspendida por pago",
  EN_MANTENIMIENTO: "En mantenimiento",
  BAJA_DEFINITIVA: "Baja definitiva",
};

const ESTADO_CUENTA_COLORS: Record<string, string> = {
  ACTIVA: "bg-green-900/40 text-green-400",
  SUSPENDIDA_PAGO: "bg-amber-900/40 text-amber-400",
  EN_MANTENIMIENTO: "bg-blue-900/40 text-blue-400",
  BAJA_DEFINITIVA: "bg-slate-700 text-slate-400",
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
  VENCIDO: "bg-orange-900/40 text-orange-400",
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
      solicitudes_cambio: {
        where: { estado: "PENDIENTE" },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!perfil || perfil.rol !== "CLIENTE") notFound();

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

      {/* Datos del perfil — editable */}
      <section aria-labelledby="perfil-heading">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 id="perfil-heading" className="text-2xl font-bold text-white">
            {perfil.nombre}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                perfil.activo
                  ? "bg-green-900/40 text-green-400"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {perfil.activo ? "Activo" : "Inactivo"}
            </span>
            <Link
              href={`/admin/vista-cliente/${perfil.id}`}
              className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
              title="Ver el portal exactamente como lo ve el cliente"
            >
              Ver portal
            </Link>
          </div>
        </div>

        {/* WhatsApp rápido */}
        {perfil.telefono && (
          <div className="mb-4">
            <a
              href={`https://wa.me/${perfil.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${perfil.nombre.split(" ")[0]}, te contactamos de Escobar Instalaciones.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              <span aria-hidden="true">📱</span>
              WhatsApp — {perfil.telefono}
            </a>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <EditarClienteForm cliente={{
            id: perfil.id,
            nombre: perfil.nombre,
            dni: perfil.dni,
            telefono: perfil.telefono,
            email: perfil.email ?? null,
            activo: perfil.activo,
            tipo_titular: perfil.tipo_titular,
          }} />
        </div>
      </section>

      {/* Cuentas */}
      <section aria-labelledby="cuentas-heading">
        <h2 id="cuentas-heading" className="text-lg font-semibold text-white mb-4">
          Cuentas ({perfil.cuentas.length})
        </h2>

        {perfil.cuentas.length > 0 && (
          <div className="space-y-4 mb-4">
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
                      <Link
                        href={`/admin/cuentas/${cuenta.id}`}
                        className="font-semibold text-white hover:text-orange-400 transition-colors"
                      >
                        {cuenta.descripcion}
                      </Link>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {CATEGORIA[cuenta.categoria]} · Ref: {cuenta.softguard_ref}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                        ESTADO_CUENTA_COLORS[cuenta.estado] ?? "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {ESTADO_CUENTA[cuenta.estado] ?? cuenta.estado}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <span className="text-slate-400">
                      Tarifa mensual:{" "}
                      <strong className="text-white">
                        {cuenta.costo_mensual != null
                          ? `$${Number(cuenta.costo_mensual).toLocaleString("es-AR")}`
                          : "tarifa estándar"}
                      </strong>
                    </span>
                    {solicitudesAbiertas > 0 && (
                      <span className="text-yellow-400 font-medium">
                        {solicitudesAbiertas} solicitud(es) abierta(s)
                      </span>
                    )}
                    <Link
                      href={`/admin/cuentas/${cuenta.id}`}
                      className="text-orange-400 hover:text-orange-300 text-xs underline underline-offset-2 ml-auto"
                    >
                      Ver detalle →
                    </Link>
                  </div>

                  {/* Pago del mes actual */}
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      Pago {mes}/{anio}
                    </p>
                    {pagoEsteMes ? (
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-semibold px-3 py-1 rounded-full ${
                            ESTADO_PAGO_COLORES[pagoEsteMes.estado] ?? "bg-slate-700 text-slate-300"
                          }`}
                        >
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

        {/* Agregar nueva cuenta */}
        <NuevaCuentaForm perfilId={id} />
      </section>

      {/* Solicitudes de cambio de datos pendientes */}
      {perfil.solicitudes_cambio.length > 0 && (
        <section aria-labelledby="cambios-heading">
          <h2 id="cambios-heading" className="text-lg font-semibold text-white mb-4">
            Solicitudes de cambio de datos ({perfil.solicitudes_cambio.length})
          </h2>

          <div className="space-y-3">
            {perfil.solicitudes_cambio.map((s) => (
              <div
                key={s.id}
                className="bg-amber-900/10 border border-amber-800/40 rounded-xl p-4"
              >
                <div className="grid sm:grid-cols-3 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Campo</p>
                    <p className="font-semibold text-white">
                      {s.campo === "nombre"
                        ? "Nombre"
                        : s.campo === "telefono"
                        ? "Teléfono"
                        : "Email"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Valor actual</p>
                    <p className="text-slate-300">{s.valor_actual ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-400 mb-0.5">Valor propuesto</p>
                    <p className="font-semibold text-white">{s.valor_nuevo}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AprobarButton id={s.id} />
                  <RechazarForm id={s.id} />
                  <EditarYAprobarForm id={s.id} valorPropuesto={s.valor_nuevo} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <EliminarClienteForm id={perfil.id} nombre={perfil.nombre} />
    </div>
  );
}

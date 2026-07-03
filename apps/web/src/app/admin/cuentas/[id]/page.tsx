import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { ActualizarCuentaForm } from "@/components/admin/ActualizarCuentaForm";
import { GestionSensores } from "@/components/admin/GestionSensores";
import { NuevaSolicitudForm } from "@/components/admin/NuevaSolicitudForm";
import { OverrideSuspensionForm } from "@/components/admin/OverrideSuspensionForm";
import { UUID_RE } from "@/lib/constants/validation";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { BotonEnviarWhatsApp } from "@/components/admin/BotonEnviarWhatsApp";
import { motivosDeCobranza, motivosGenerales, UMBRAL_MORA } from "@/lib/mensajeria-motivos";
import { getParam } from "@/lib/parametros";

const getCuenta = cache(async (id: string) => {
  return prisma.cuenta.findUnique({
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
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Cuenta" };
  const cuenta = await getCuenta(id);
  return { title: cuenta?.descripcion ?? "Cuenta" };
}

const MESES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function fechaHora(d: Date): string {
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const ESTADO_PAGO_COLORES: Record<string, string> = {
  PAGADO: "bg-green-900/40 text-green-400",
  VENCIDO: "bg-orange-900/40 text-orange-400",
  PROCESANDO: "bg-blue-900/40 text-blue-400",
  PENDIENTE: "bg-amber-900/40 text-amber-400",
};

type PagoCuentaRow = NonNullable<Awaited<ReturnType<typeof getCuenta>>>["pagos"][number];

const pagosColumns: Column<PagoCuentaRow>[] = [
  {
    id: "periodo",
    header: "Período",
    cell: (p) => <span className="text-slate-300">{MESES[p.mes]} {p.anio}</span>,
  },
  {
    id: "estado",
    header: "Estado",
    cell: (p) => (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_PAGO_COLORES[p.estado] ?? "bg-slate-700 text-slate-300"}`}>
        {p.estado}
      </span>
    ),
  },
  {
    id: "importe",
    header: "Importe",
    cell: (p) => <span className="text-white font-medium">${Number(p.importe).toLocaleString("es-AR")}</span>,
  },
  {
    id: "metodo",
    header: "Método",
    cell: (p) => <span className="text-slate-400 text-xs">{p.metodo ?? "—"}</span>,
  },
  {
    id: "registrado",
    header: "Registrado por",
    cell: (p) => <span className="text-slate-400 text-xs">{p.registrado_por ?? "—"}</span>,
  },
];

export default async function CuentaAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [cuenta, umbralMora] = await Promise.all([
    getCuenta(id),
    getParam("UMBRAL_MORA", UMBRAL_MORA),
  ]);
  if (!cuenta) notFound();

  // Motivos de WhatsApp sobre la deuda COMPLETA de la cuenta (no los 12 pagos paginados
  // de la tabla) + pagos acreditados recientemente, para que el recordatorio y la
  // confirmación usen montos/fechas correctos.
  const hace30dias = new Date();
  hace30dias.setDate(hace30dias.getDate() - 30);
  const pagosMotivos = await prisma.pago.findMany({
    where: {
      cuenta_id: cuenta.id,
      OR: [
        { estado: { in: ["PENDIENTE", "VENCIDO"] } },
        { estado: "PAGADO", acreditado_en: { gte: hace30dias } },
      ],
    },
    select: { mes: true, anio: true, importe: true, estado: true, acreditado_en: true },
  });
  const motivosWA = [
    ...motivosDeCobranza(
      cuenta.perfil.nombre,
      pagosMotivos.map((p) => ({
        mes: p.mes,
        anio: p.anio,
        importe: Number(p.importe),
        estado: p.estado,
        acreditadoEnISO: p.acreditado_en?.toISOString() ?? null,
      })),
      undefined,
      umbralMora,
    ),
    ...motivosGenerales(cuenta.perfil.nombre),
  ];

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
          <BotonEnviarWhatsApp
            destinatario={{ nombre: cuenta.perfil.nombre, telefono: cuenta.perfil.telefono }}
            motivos={motivosWA}
            historial={{ perfilId: cuenta.perfil.id, cuentaId: cuenta.id }}
            entidad="cuenta"
            entidadId={cuenta.id}
          />
          <Link
            href={`/admin/vista-cliente/${cuenta.perfil.id}?tab=cuenta&cuentaId=${cuenta.id}`}
            className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
            title="Ver esta cuenta exactamente como la ve el cliente"
          >
            Ver portal del cliente
          </Link>
        </div>
      </div>

      {/* Estado del panel según la central (proyección sg_*, la llena el cron) */}
      <section aria-labelledby="panel-heading">
        <h2 id="panel-heading" className="text-lg font-semibold text-white mb-4">
          Panel — central de monitoreo
        </h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          {!cuenta.sg_synced_at ? (
            <p className="text-sm text-slate-500">
              Sin datos de la central todavía — esperando la primera sincronización.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-400 mb-1">Situación en la central</dt>
                  <dd>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        cuenta.sg_situacion === "Habilitado"
                          ? "bg-emerald-900/40 text-emerald-400"
                          : "bg-red-900/40 text-red-400"
                      }`}
                    >
                      {cuenta.sg_situacion ?? "Sin dato"}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 mb-1">Alimentación</dt>
                  <dd>
                    {cuenta.sg_en_fallo_ac ? (
                      <p className="font-semibold text-red-300">
                        ⚠ Sin 220v
                        {cuenta.sg_fallo_ac_desde && (
                          <span className="font-normal text-red-400/80">
                            {" "}— detectado el {fechaHora(cuenta.sg_fallo_ac_desde)}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-emerald-400">✓ 220v OK</p>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 mb-1">Test periódico</dt>
                  <dd>
                    {cuenta.sg_en_fallo_tst ? (
                      <p className="font-semibold text-amber-300">
                        ⚠ Sin reportar
                        {cuenta.sg_fallo_tst_desde && (
                          <span className="font-normal text-amber-400/80">
                            {" "}desde el {fechaHora(cuenta.sg_fallo_tst_desde)}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-emerald-400">✓ Reportando</p>
                    )}
                    {cuenta.sg_ultimo_tst && (
                      <p className="text-xs text-slate-500 mt-1">
                        Último test: {fechaHora(cuenta.sg_ultimo_tst)}
                      </p>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 mb-1">Último evento</dt>
                  <dd>
                    {cuenta.sg_ultimo_evento ? (
                      <>
                        <p className="text-slate-200">{cuenta.sg_ultimo_evento}</p>
                        {cuenta.sg_ultimo_evento_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            {fechaHora(cuenta.sg_ultimo_evento_at)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500">Sin eventos registrados.</p>
                    )}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-slate-600 mt-4 pt-3 border-t border-slate-700/60">
                Sincronizado de la central: {fechaHora(cuenta.sg_synced_at)}
              </p>
            </>
          )}
        </div>
      </section>

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

        {cuenta.solicitudes.length === 0 && (
          <p className="text-sm text-slate-500 mb-4">Sin solicitudes abiertas.</p>
        )}

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
      <section aria-labelledby="pagos-heading">
        <h2 id="pagos-heading" className="text-lg font-semibold text-white mb-4">
          Últimos pagos
        </h2>

        <DataTable
          columns={pagosColumns}
          rows={cuenta.pagos}
          keyExtractor={(p) => p.id}
          caption="Últimos pagos de la cuenta"
          emptyState={<p className="text-sm text-slate-500">No hay pagos registrados para esta cuenta.</p>}
        />
      </section>
    </div>
  );
}

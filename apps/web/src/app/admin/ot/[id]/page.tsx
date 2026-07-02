import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { AsignarTecnicoForm } from "@/components/admin/ot/AsignarTecnicoForm";
import { CambiarEstadoOTButtons } from "@/components/admin/ot/CambiarEstadoOTButtons";
import { EstadoSerTecCard } from "@/components/admin/ot/EstadoSerTecCard";

import { UUID_RE } from "@/lib/constants/validation";
import { calcularCostoTotalMateriales } from "@/lib/ot-materiales";

export const metadata: Metadata = { title: "Detalle de OT" };

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  SOLICITADA: { label: "Solicitada", cls: "bg-amber-900/40 text-amber-300" },
  ASIGNADA:   { label: "Asignada",   cls: "bg-blue-900/40 text-blue-300" },
  EN_RUTA:    { label: "En ruta",    cls: "bg-indigo-900/40 text-indigo-300" },
  EN_SITIO:   { label: "En sitio",   cls: "bg-emerald-900/40 text-emerald-300" },
  COMPLETADA: { label: "Completada", cls: "bg-slate-700 text-slate-400" },
  CANCELADA:  { label: "Cancelada",  cls: "bg-red-900/40 text-red-400" },
};
const TIPO_LABEL: Record<string, string> = {
  INSTALACION: "Instalación", CORRECTIVO: "Correctivo",
  PREVENTIVO: "Preventivo", RETIRO: "Retiro",
};

export default async function OTDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [ot, tecnicos, materialesUsados] = await Promise.all([
    prisma.ordenTrabajo.findUnique({
      where: { id },
      include: {
        tecnico:  { include: { perfil: { select: { nombre: true, email: true, telefono: true } } } },
        cuenta:   { include: { perfil: { select: { nombre: true, telefono: true } } } },
        perfil:   { select: { nombre: true, telefono: true } },
        reservas_vehiculo: { include: { vehiculo: { select: { marca: true, modelo: true, patente: true } } } },
      },
    }),
    prisma.empleado.findMany({
      where: { activo: true, puede_instalar: true },
      include: { perfil: { select: { nombre: true } } },
    }),
    // Pre-migración (tabla nueva todavía no aplicada) la query falla — se
    // degrada a [] y la vista cae al campo legacy `materiales_usados`.
    prisma.materialUsadoOT.findMany({
      where: { ot_id: id },
      orderBy: { created_at: "asc" },
      include: { material: { select: { nombre: true, unidad: true } } },
    }).catch(() => []),
  ]);

  if (!ot) notFound();

  const clienteNombre = ot.cuenta?.perfil.nombre ?? ot.perfil?.nombre ?? "—";
  const clienteTelefono = ot.cuenta?.perfil.telefono ?? ot.perfil?.telefono ?? null;
  const fotos: string[] = ot.fotos_urls ? JSON.parse(ot.fotos_urls) : [];
  const reserva = ot.reservas_vehiculo[0] ?? null;
  const costoTotalMateriales = calcularCostoTotalMateriales(
    materialesUsados.map((m) => ({
      cantidad: Number(m.cantidad),
      costo_unitario: m.costo_unitario !== null ? Number(m.costo_unitario) : null,
    }))
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/ot" className="text-slate-400 hover:text-white text-sm mt-1 min-h-[44px] inline-flex items-center">← Volver</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              OT #{String(ot.numero).padStart(4, "0")}
            </h1>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {TIPO_LABEL[ot.tipo]}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[ot.estado]?.cls ?? "bg-slate-700 text-slate-400"}`}>
              {ESTADO_BADGE[ot.estado]?.label ?? ot.estado}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">{ot.descripcion}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cliente */}
        <Card titulo="Cliente">
          <p className="font-medium text-white">{clienteNombre}</p>
          {clienteTelefono && (
            <a href={`https://wa.me/549${clienteTelefono.replace(/\D/g, "")}`}
               target="_blank" rel="noopener noreferrer"
               className="text-xs text-emerald-400 hover:text-emerald-300">
              WhatsApp {clienteTelefono}
            </a>
          )}
          {ot.cuenta && (
            <p className="text-xs text-slate-500 mt-1">{ot.cuenta.descripcion}</p>
          )}
        </Card>

        {/* Técnico */}
        <Card titulo="Técnico asignado">
          {ot.tecnico ? (
            <>
              <p className="font-medium text-white">{ot.tecnico.perfil.nombre}</p>
              {ot.fecha_visita && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(ot.fecha_visita).toLocaleString("es-AR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
              {reserva && (
                <p className="text-xs text-emerald-500 mt-1">
                  Vehículo: {reserva.vehiculo.marca} {reserva.vehiculo.modelo} — {reserva.vehiculo.patente}
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm">Sin asignar</p>
          )}
        </Card>
      </div>

      {/* Estado real en la central (si la OT se promovió a SoftGuard ST) */}
      {ot.st_softguard_numero != null && (
        <Suspense
          fallback={
            <Card titulo={`SoftGuard — Servicio Técnico (orden #${ot.st_softguard_numero})`}>
              <p className="text-sm text-slate-500">Consultando la central…</p>
            </Card>
          }
        >
          <EstadoSerTecCard numero={ot.st_softguard_numero} />
        </Suspense>
      )}

      {/* Asignar técnico (si no está completada/cancelada) */}
      {!["COMPLETADA", "CANCELADA"].includes(ot.estado) && (
        <Card titulo="Asignar / reasignar técnico">
          <AsignarTecnicoForm
            ot_id={ot.id}
            tecnicos={tecnicos}
            tecnico_actual={ot.tecnico_id ?? undefined}
            fecha_actual={ot.fecha_visita ?? undefined}
          />
        </Card>
      )}

      {/* Cambiar estado */}
      {!["COMPLETADA", "CANCELADA"].includes(ot.estado) && (
        <Card titulo="Avanzar estado">
          <CambiarEstadoOTButtons ot_id={ot.id} estado_actual={ot.estado} />
        </Card>
      )}

      {/* Tiempos */}
      {(ot.hora_salida || ot.hora_llegada || ot.hora_fin) && (
        <Card titulo="Tiempos registrados">
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {ot.hora_salida && (
              <Dt label="Salida" valor={new Date(ot.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} />
            )}
            {ot.hora_llegada && (
              <Dt label="Llegada" valor={new Date(ot.hora_llegada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} />
            )}
            {ot.hora_fin && (
              <Dt label="Fin" valor={new Date(ot.hora_fin).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} />
            )}
          </dl>
        </Card>
      )}

      {/* GPS */}
      {(ot.gps_checkin_lat || ot.gps_salida_lat) && (
        <Card titulo="GPS">
          <div className="space-y-2 text-xs font-mono text-slate-400">
            {ot.gps_salida_lat && (
              <a
                href={`https://www.google.com/maps?q=${ot.gps_salida_lat},${ot.gps_salida_lng}`}
                target="_blank" rel="noopener noreferrer"
                aria-label="Ver punto de salida en Google Maps"
                className="flex items-center gap-2 hover:text-slate-200 transition-colors"
              >
                <span className="text-slate-400">Salida:</span>
                {String(ot.gps_salida_lat)}, {String(ot.gps_salida_lng)}
                <span className="text-orange-400 text-xs" aria-hidden="true">↗ Maps</span>
              </a>
            )}
            {ot.gps_checkin_lat && (
              <a
                href={`https://www.google.com/maps?q=${ot.gps_checkin_lat},${ot.gps_checkin_lng}`}
                target="_blank" rel="noopener noreferrer"
                aria-label="Ver punto de llegada en Google Maps"
                className="flex items-center gap-2 hover:text-slate-200 transition-colors"
              >
                <span className="text-slate-400">Llegada:</span>
                {String(ot.gps_checkin_lat)}, {String(ot.gps_checkin_lng)}
                <span className="text-orange-400 text-xs" aria-hidden="true">↗ Maps</span>
              </a>
            )}
            {ot.gps_checkout_lat && (
              <a
                href={`https://www.google.com/maps?q=${ot.gps_checkout_lat},${ot.gps_checkout_lng}`}
                target="_blank" rel="noopener noreferrer"
                aria-label="Ver punto de salida del sitio en Google Maps"
                className="flex items-center gap-2 hover:text-slate-200 transition-colors"
              >
                <span className="text-slate-400">Salida del sitio:</span>
                {String(ot.gps_checkout_lat)}, {String(ot.gps_checkout_lng)}
                <span className="text-orange-400 text-xs" aria-hidden="true">↗ Maps</span>
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Fotos */}
      {fotos.length > 0 && (
        <Card titulo={`Fotos (${fotos.length})`}>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Ver foto ${i + 1} a tamaño completo`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1} de la OT`} className="rounded-lg object-cover aspect-square w-full hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Firma */}
      {ot.firma_cliente_url ? (
        <Card titulo="Firma del cliente">
          <div className="bg-white rounded-lg p-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ot.firma_cliente_url} alt="Firma del cliente" className="max-h-32" />
          </div>
          <p className="text-xs text-emerald-400 mt-2">Conformidad firmada</p>
        </Card>
      ) : ot.motivo_no_firma ? (
        <Card titulo="Firma del cliente">
          <p className="text-sm text-amber-400">Sin firma — {ot.motivo_no_firma}</p>
        </Card>
      ) : null}

      {/* Materiales */}
      {materialesUsados.length > 0 ? (
        <Card titulo={`Materiales (${materialesUsados.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-1 pr-2 font-medium">Material</th>
                  <th className="pb-1 pr-2 font-medium">Cantidad</th>
                  <th className="pb-1 font-medium text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {materialesUsados.map((m) => {
                  const cantidad = Number(m.cantidad);
                  const costoUnitario = m.costo_unitario !== null ? Number(m.costo_unitario) : null;
                  return (
                    <tr key={m.id} className="border-t border-slate-800">
                      <td className="py-1.5 pr-2 text-white">{m.material.nombre}</td>
                      <td className="py-1.5 pr-2 text-slate-300">{cantidad} {m.material.unidad}</td>
                      <td className="py-1.5 text-right text-slate-300">
                        {costoUnitario !== null ? `$${(cantidad * costoUnitario).toLocaleString("es-AR")}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700">
                  <td colSpan={2} className="pt-1.5 text-xs text-slate-400">Total</td>
                  <td className="pt-1.5 text-right text-sm font-semibold text-white">
                    ${costoTotalMateriales.toLocaleString("es-AR")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : ot.materiales_usados ? (
        <Card titulo="Materiales (legacy)">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{ot.materiales_usados}</p>
        </Card>
      ) : null}

      {/* Notas */}
      {(ot.notas_admin || ot.notas_tecnico) && (
        <Card titulo="Notas">
          {ot.notas_admin   && <p className="text-sm text-slate-300"><span className="text-slate-400 text-xs">Admin: </span>{ot.notas_admin}</p>}
          {ot.notas_tecnico && <p className="text-sm text-slate-300 mt-1"><span className="text-slate-400 text-xs">Técnico: </span>{ot.notas_tecnico}</p>}
        </Card>
      )}

      {/* Satisfacción */}
      {ot.satisfaccion_cliente && (
        <Card titulo="Satisfacción del cliente">
          <p className="text-2xl" aria-hidden="true">
            {"★".repeat(ot.satisfaccion_cliente)}{"☆".repeat(5 - ot.satisfaccion_cliente)}
          </p>
          <span className="sr-only">Satisfacción: {ot.satisfaccion_cliente} de 5</span>
          {ot.satisfaccion_comentario && (
            <p className="text-sm text-slate-400 mt-1">"{ot.satisfaccion_comentario}"</p>
          )}
        </Card>
      )}
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{titulo}</h3>
      {children}
    </div>
  );
}

function Dt({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-white">{valor}</p>
    </div>
  );
}

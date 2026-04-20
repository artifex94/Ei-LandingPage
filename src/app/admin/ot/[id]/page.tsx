import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { AsignarTecnicoForm } from "@/components/admin/ot/AsignarTecnicoForm";
import { CambiarEstadoOTButtons } from "@/components/admin/ot/CambiarEstadoOTButtons";

export const metadata: Metadata = { title: "Detalle OT — Admin" };

const ESTADO_LABEL: Record<string, string> = {
  SOLICITADA: "Solicitada", ASIGNADA: "Asignada", EN_RUTA: "En ruta",
  EN_SITIO: "En sitio", COMPLETADA: "Completada", CANCELADA: "Cancelada",
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

  const [ot, tecnicos] = await Promise.all([
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
  ]);

  if (!ot) notFound();

  const clienteNombre = ot.cuenta?.perfil.nombre ?? ot.perfil?.nombre ?? "—";
  const clienteTelefono = ot.cuenta?.perfil.telefono ?? ot.perfil?.telefono ?? null;
  const fotos: string[] = ot.fotos_urls ? JSON.parse(ot.fotos_urls) : [];
  const reserva = ot.reservas_vehiculo[0] ?? null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/ot" className="text-slate-400 hover:text-white text-sm mt-1">← Volver</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              OT #{String(ot.numero).padStart(4, "0")}
            </h1>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {TIPO_LABEL[ot.tipo]}
            </span>
            <span className="text-xs font-medium text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
              {ESTADO_LABEL[ot.estado]}
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
          <div className="space-y-1 text-xs font-mono text-slate-400">
            {ot.gps_salida_lat   && <p>Salida:  {String(ot.gps_salida_lat)}, {String(ot.gps_salida_lng)}</p>}
            {ot.gps_checkin_lat  && <p>Llegada: {String(ot.gps_checkin_lat)}, {String(ot.gps_checkin_lng)}</p>}
            {ot.gps_checkout_lat && <p>Salida del sitio: {String(ot.gps_checkout_lat)}, {String(ot.gps_checkout_lng)}</p>}
          </div>
        </Card>
      )}

      {/* Fotos */}
      {fotos.length > 0 && (
        <Card titulo={`Fotos (${fotos.length})`}>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1}`} className="rounded-lg object-cover aspect-square w-full hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Firma */}
      {ot.firma_cliente_url && (
        <Card titulo="Firma del cliente">
          <div className="bg-white rounded-lg p-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ot.firma_cliente_url} alt="Firma del cliente" className="max-h-32" />
          </div>
          <p className="text-xs text-emerald-400 mt-2">Conformidad firmada</p>
        </Card>
      )}

      {/* Notas */}
      {(ot.notas_admin || ot.notas_tecnico) && (
        <Card titulo="Notas">
          {ot.notas_admin   && <p className="text-sm text-slate-300"><span className="text-slate-500 text-xs">Admin: </span>{ot.notas_admin}</p>}
          {ot.notas_tecnico && <p className="text-sm text-slate-300 mt-1"><span className="text-slate-500 text-xs">Técnico: </span>{ot.notas_tecnico}</p>}
        </Card>
      )}

      {/* Satisfacción */}
      {ot.satisfaccion_cliente && (
        <Card titulo="Satisfacción del cliente">
          <p className="text-2xl">{"★".repeat(ot.satisfaccion_cliente)}{"☆".repeat(5 - ot.satisfaccion_cliente)}</p>
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
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
      {children}
    </div>
  );
}

function Dt({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-white">{valor}</p>
    </div>
  );
}

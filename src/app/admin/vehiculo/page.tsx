import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { VehiculoCard } from "@/components/admin/vehiculo/VehiculoCard";
import { ReservasVehiculo } from "@/components/admin/vehiculo/ReservasVehiculo";
import { NuevaReservaDialog } from "@/components/admin/vehiculo/NuevaReservaDialog";
import { EditarVehiculoDialog } from "@/components/admin/vehiculo/EditarVehiculoDialog";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_VEHICULO = [
  {
    titulo: "Registrar kilómetros",
    descripcion: 'Actualizá los km del vehículo después de cada salida. Usá "Editar" en la card del vehículo para actualizar.',
  },
  {
    titulo: "Crear una reserva",
    descripcion: 'Con "+ Nueva reserva" asignás el vehículo a un empleado para un rango horario. Evita conflictos de uso.',
  },
  {
    titulo: "Ver historial",
    descripcion: "Las reservas pasadas quedan en el historial. Sirve para auditar quién usó el vehículo y cuándo.",
  },
];

export const metadata: Metadata = { title: "Vehículo" };

export default async function VehiculoPage() {
  const [vehiculos, empleados] = await Promise.all([
    prisma.vehiculo.findMany({
      where: { activo: true },
      include: {
        reservas: {
          where: {
            estado: { in: ["RESERVADA", "EN_USO"] },
            hasta: { gte: new Date() },
          },
          include: { empleado: { include: { perfil: { select: { nombre: true } } } } },
          orderBy: { desde: "asc" },
          take: 20,
        },
      },
    }),
    prisma.empleado.findMany({
      where: { activo: true },
      include: { perfil: { select: { nombre: true } } },
      orderBy: { created_at: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vehículo</h1>
          <p className="text-sm text-slate-400 mt-1">
            Reservas y kilometraje del vehículo de la empresa
          </p>
        </div>
        {vehiculos.length > 0 && (
          <NuevaReservaDialog vehiculos={vehiculos} empleados={empleados} />
        )}
      </div>

      {vehiculos.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
          <p className="text-slate-400">No hay vehículos registrados.</p>
        </div>
      ) : (
        vehiculos.map((v) => (
          <div key={v.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <VehiculoCard vehiculo={v} />
              </div>
              <EditarVehiculoDialog vehiculo={v} />
            </div>
            <ReservasVehiculo reservas={v.reservas} />
          </div>
        ))
      )}

      <TutorialContextual
        section="vehiculo"
        titulo="Guía rápida — Vehículo"
        steps={TUTORIAL_VEHICULO}
      />
    </div>
  );
}

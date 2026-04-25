import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { VehiculoCard } from "@/components/admin/vehiculo/VehiculoCard";
import { ReservasVehiculo } from "@/components/admin/vehiculo/ReservasVehiculo";
import { NuevaReservaDialog } from "@/components/admin/vehiculo/NuevaReservaDialog";
import { EditarVehiculoDialog } from "@/components/admin/vehiculo/EditarVehiculoDialog";

export const metadata: Metadata = { title: "Vehículo — Admin" };

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
          include: { empleado: { include: { perfil: true } } },
          orderBy: { desde: "asc" },
          take: 20,
        },
      },
    }),
    prisma.empleado.findMany({
      where: { activo: true },
      include: { perfil: true },
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
    </div>
  );
}

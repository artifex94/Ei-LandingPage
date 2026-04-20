import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { AusenciasTable } from "@/components/admin/ausencias/AusenciasTable";
import { NuevaAusenciaDialog } from "@/components/admin/ausencias/NuevaAusenciaDialog";

export const metadata: Metadata = { title: "Ausencias — Admin" };

const TIPO_LABEL: Record<string, string> = {
  VACACIONES: "Vacaciones",
  ENFERMEDAD: "Enfermedad",
  PERSONAL:   "Personal",
  FERIADO:    "Feriado",
};

export default async function AusenciasPage() {
  const [empleados, ausencias] = await Promise.all([
    prisma.empleado.findMany({
      where: { activo: true },
      include: { perfil: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.ausencia.findMany({
      include: { empleado: { include: { perfil: true } } },
      orderBy: { desde: "desc" },
      take: 60,
    }),
  ]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const activas  = ausencias.filter((a) => new Date(a.hasta) >= hoy);
  const pasadas  = ausencias.filter((a) => new Date(a.hasta) < hoy);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ausencias</h1>
          <p className="text-sm text-slate-400 mt-1">
            {activas.length} activa{activas.length !== 1 ? "s" : ""} · {pasadas.length} pasadas
          </p>
        </div>
        <NuevaAusenciaDialog empleados={empleados} />
      </div>

      <AusenciasTable ausencias={ausencias} tipoLabel={TIPO_LABEL} hoyIso={hoy.toISOString().slice(0, 10)} />
    </div>
  );
}

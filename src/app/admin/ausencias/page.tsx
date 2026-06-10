import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { AusenciasTable } from "@/components/admin/ausencias/AusenciasTable";
import { NuevaAusenciaDialog } from "@/components/admin/ausencias/NuevaAusenciaDialog";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_AUSENCIAS = [
  {
    titulo: "Registrar una ausencia",
    descripcion: 'Con "+ Nueva ausencia" cargás quién falta, el tipo (enfermedad, vacaciones, etc.) y el rango de fechas.',
  },
  {
    titulo: "Impacto en turnos",
    descripcion: "Si el empleado ausente tenía turnos asignados en esas fechas, los turnos quedan sin cobertura. Revisá el calendario de turnos.",
  },
  {
    titulo: "Activas vs pasadas",
    descripcion: "La tabla separa ausencias activas (hoy o futuras) de pasadas. Las pasadas son historial y no se pueden editar.",
  },
];

export const metadata: Metadata = { title: "Ausencias" };

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
      include: { perfil: { select: { nombre: true } } },
      orderBy: { created_at: "asc" },
    }),
    prisma.ausencia.findMany({
      include: { empleado: { include: { perfil: { select: { nombre: true } } } } },
      orderBy: { desde: "desc" },
      take: 60,
    }),
  ]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const activas  = ausencias.filter((a) => new Date(a.hasta) >= hoy);
  const pasadas  = ausencias.filter((a) => new Date(a.hasta) < hoy);

  return (
    <section aria-labelledby="ausencias-heading" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 id="ausencias-heading" className="text-2xl font-bold text-white">Ausencias</h1>
          <p className="text-sm text-slate-400 mt-1">
            {activas.length} activa{activas.length !== 1 ? "s" : ""} · {pasadas.length} pasadas
          </p>
        </div>
        <NuevaAusenciaDialog empleados={empleados} />
      </div>

      <AusenciasTable ausencias={ausencias} tipoLabel={TIPO_LABEL} hoyIso={hoy.toISOString().slice(0, 10)} />

      <TutorialContextual
        section="ausencias"
        titulo="Guía rápida — Ausencias"
        steps={TUTORIAL_AUSENCIAS}
      />
    </section>
  );
}

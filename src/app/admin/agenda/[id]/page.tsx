import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma/client";
import { EditarTareaForm } from "./EditarTareaForm";
import { UUID_RE } from "@/lib/constants/validation";

export const metadata = { title: "Editar tarea" };

export default async function EditarTareaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [tarea, tecnicos, cuentas] = await Promise.all([
    prisma.tareaAgendada.findUnique({
      where: { id },
      include: {
        cuenta: { select: { id: true, descripcion: true, calle: true, localidad: true } },
        tecnico: { select: { nombre: true } },
      },
    }),
    prisma.perfil.findMany({
      where: { rol: "TECNICO" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.cuenta.findMany({
      where: { estado: { not: "BAJA_DEFINITIVA" } },
      select: { id: true, descripcion: true, calle: true, localidad: true },
      orderBy: { descripcion: "asc" },
      take: 200,
    }),
  ]);

  if (!tarea) notFound();

  const fechaISO = format(new Date(tarea.fecha), "yyyy-MM-dd");

  return (
    <EditarTareaForm
      tarea={{ ...tarea, fechaISO }}
      tecnicos={tecnicos}
      cuentas={cuentas}
    />
  );
}

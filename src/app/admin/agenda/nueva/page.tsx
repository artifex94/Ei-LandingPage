import { prisma } from "@/lib/prisma/client";
import { NuevaTareaForm } from "./NuevaTareaForm";

export const metadata = { title: "Nueva tarea — Admin EI" };

export default async function NuevaTareaPage() {
  const [tecnicos, cuentas] = await Promise.all([
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

  return <NuevaTareaForm tecnicos={tecnicos} cuentas={cuentas} />;
}

import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { OtsClient, type OTCard } from "./OtsClient";

export const metadata = { title: "OTs" };

export default async function OtsPage() {
  const { userId } = await requireSesion();

  // empleado y disponibles son independientes — se resuelven en paralelo
  const [empleado, disponiblesRaw] = await Promise.all([
    prisma.empleado.findFirst({
      where: { perfil_id: userId },
      select: { id: true },
    }),
    // OTs sin técnico asignado, estado SOLICITADA
    prisma.ordenTrabajo.findMany({
      where: { estado: "SOLICITADA", tecnico_id: null },
      include: {
        cuenta: {
          select: {
            calle: true,
            localidad: true,
            perfil: { select: { nombre: true, telefono: true } },
          },
        },
        perfil: { select: { nombre: true, telefono: true } },
      },
      orderBy: [{ prioridad: "desc" }, { created_at: "asc" }],
      take: 50,
    }),
  ]);

  // OTs asignadas al técnico — depende de empleado.id
  const misOTsRaw = empleado
    ? await prisma.ordenTrabajo.findMany({
        where: {
          tecnico_id: empleado.id,
          estado:     { in: ["ASIGNADA", "EN_RUTA", "EN_SITIO"] },
        },
        include: {
          cuenta: {
            select: {
              calle: true,
              localidad: true,
              perfil: { select: { nombre: true, telefono: true } },
            },
          },
          perfil: { select: { nombre: true, telefono: true } },
          tarea:  { select: { id: true } },
        },
        orderBy: { fecha_visita: "asc" },
      })
    : [];

  function mapOT(ot: typeof disponiblesRaw[0], tareaId?: string | null): OTCard {
    return {
      id:          ot.id,
      numero:      ot.numero,
      tipo:        ot.tipo,
      descripcion: ot.descripcion,
      prioridad:   ot.prioridad,
      estado:      ot.estado,
      fecha_visita: ot.fecha_visita ? ot.fecha_visita.toISOString() : null,
      cliente:     ot.cuenta?.perfil.nombre ?? ot.perfil?.nombre ?? "Cliente sin nombre",
      direccion:   ot.cuenta?.calle
        ? [ot.cuenta.calle, ot.cuenta.localidad].filter(Boolean).join(", ")
        : null,
      telefono:    ot.cuenta?.perfil.telefono ?? ot.perfil?.telefono ?? null,
      tarea_id:    tareaId ?? null,
    };
  }

  const disponibles = disponiblesRaw.map((ot) => mapOT(ot));
  const misOTs = (misOTsRaw as typeof misOTsRaw).map((ot) =>
    mapOT(ot, (ot as typeof misOTsRaw[0]).tarea?.id)
  );

  return (
    <OtsClient
      disponibles={disponibles}
      misOTs={misOTs}
      tieneEmpleado={!!empleado}
    />
  );
}

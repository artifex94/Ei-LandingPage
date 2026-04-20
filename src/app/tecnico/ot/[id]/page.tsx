import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { OTCampoClient } from "./OTCampoClient";

export default async function TecnicoOTPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      cuenta: {
        select: {
          descripcion: true,
          calle: true,
          localidad: true,
          provincia: true,
          perfil: { select: { nombre: true, telefono: true } },
        },
      },
      perfil: { select: { nombre: true, telefono: true } },
      tecnico: { select: { perfil_id: true } },
    },
  });

  if (!ot) notFound();

  // Solo el técnico asignado o un admin puede acceder
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id }, select: { rol: true } });
  const empleado = await prisma.empleado.findUnique({ where: { perfil_id: user.id } });
  const esTecnicoAsignado = empleado && ot.tecnico?.perfil_id === user.id;
  if (!esTecnicoAsignado && perfil?.rol !== "ADMIN") redirect("/tecnico");

  const fotos: string[] = ot.fotos_urls ? JSON.parse(ot.fotos_urls) : [];

  return (
    <OTCampoClient
      ot={{
        id:               ot.id,
        numero:           ot.numero,
        tipo:             ot.tipo,
        descripcion:      ot.descripcion,
        estado:           ot.estado,
        fecha_visita:     ot.fecha_visita?.toISOString() ?? null,
        notas_admin:      ot.notas_admin ?? null,
        hora_salida:      ot.hora_salida?.toISOString() ?? null,
        hora_llegada:     ot.hora_llegada?.toISOString() ?? null,
        hora_fin:         ot.hora_fin?.toISOString() ?? null,
        conformidad_firmada: ot.conformidad_firmada,
        firma_cliente_url:   ot.firma_cliente_url ?? null,
        fotos,
        clienteNombre:    ot.cuenta?.perfil.nombre ?? ot.perfil?.nombre ?? "—",
        clienteTelefono:  ot.cuenta?.perfil.telefono ?? ot.perfil?.telefono ?? null,
        direccion:        ot.cuenta?.calle
          ? `${ot.cuenta.calle}, ${ot.cuenta.localidad ?? ""}`
          : null,
      }}
    />
  );
}

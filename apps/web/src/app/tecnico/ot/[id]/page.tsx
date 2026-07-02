import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { OTCampoClient } from "./OTCampoClient";
import { UUID_RE } from "@/lib/constants/validation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Orden de trabajo" };
  const ot = await prisma.ordenTrabajo.findUnique({ where: { id }, select: { numero: true } });
  return { title: ot ? `OT #${String(ot.numero).padStart(4, "0")}` : "Orden de trabajo" };
}

export default async function TecnicoOTPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { userId, perfil } = await requireSesion();

  const [ot, empleado] = await Promise.all([
    prisma.ordenTrabajo.findUnique({
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
    }),
    // Independiente de ot — se resuelven en paralelo
    prisma.empleado.findUnique({ where: { perfil_id: userId } }),
  ]);

  if (!ot) notFound();
  const esTecnicoAsignado = empleado && ot.tecnico?.perfil_id === userId;
  if (!esTecnicoAsignado && perfil.rol !== "ADMIN") redirect("/tecnico");

  const fotos: string[] = ot.fotos_urls ? JSON.parse(ot.fotos_urls) : [];

  // Catálogo de materiales — pre-migración (tablas nuevas todavía no
  // aplicadas en producción) la query falla; se degrada a [] y el cliente
  // cae al textarea legacy `materiales_usados`.
  const [catalogo, materialesUsados] = await Promise.all([
    prisma.materialCatalogo.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, unidad: true },
    }).catch(() => []),
    prisma.materialUsadoOT.findMany({
      where: { ot_id: id },
      orderBy: { created_at: "asc" },
      include: { material: { select: { nombre: true, unidad: true } } },
    }).catch(() => []),
  ]);

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
      catalogo={catalogo}
      materialesInicial={materialesUsados.map((m) => ({
        id: m.id,
        material_id: m.material_id,
        nombre: m.material.nombre,
        unidad: m.material.unidad,
        cantidad: Number(m.cantidad),
        costo_unitario: m.costo_unitario !== null ? Number(m.costo_unitario) : null,
      }))}
    />
  );
}

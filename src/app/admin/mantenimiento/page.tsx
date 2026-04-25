import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { IniciarButton, ResolverButton, ReopenButton } from "./AccionesForm";
import { NuevaSolicitudAdminDialog } from "@/components/admin/NuevaSolicitudAdminDialog";

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE:   { label: "Pendiente",   cls: "bg-amber-900/40 text-amber-400 border-amber-800/40" },
  EN_PROCESO:  { label: "En proceso",  cls: "bg-blue-900/40 text-blue-400 border-blue-800/40" },
  RESUELTA:    { label: "Resuelta",    cls: "bg-green-900/40 text-green-400 border-green-800/40" },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; cls: string }> = {
  BAJA:  { label: "Baja",  cls: "text-slate-400" },
  MEDIA: { label: "Media", cls: "text-amber-400" },
  ALTA:  { label: "Alta",  cls: "text-red-400 font-semibold" },
};

export default async function MantenimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const sp = await searchParams;
  const filtroEstado = (sp.estado ?? "abiertas") as "abiertas" | "resueltas" | "todas";

  const whereEstado =
    filtroEstado === "abiertas"
      ? { estado: { not: "RESUELTA" as const } }
      : filtroEstado === "resueltas"
      ? { estado: "RESUELTA" as const }
      : {};

  const solicitudes = await prisma.solicitudMantenimiento.findMany({
    where: whereEstado,
    include: {
      cuenta: {
        select: {
          id: true,
          descripcion: true,
          softguard_ref: true,
          perfil: { select: { id: true, nombre: true, telefono: true } },
        },
      },
    },
    orderBy: [
      { prioridad: "desc" },
      { creada_en: "asc" },
    ],
  });

  const [cuentaAbiertas, cuentasActivas] = await Promise.all([
    prisma.solicitudMantenimiento.count({ where: { estado: { not: "RESUELTA" } } }),
    prisma.cuenta.findMany({
      where: { estado: { in: ["ACTIVA", "SUSPENDIDA_PAGO", "EN_MANTENIMIENTO"] } },
      select: {
        id: true,
        descripcion: true,
        softguard_ref: true,
        perfil: { select: { nombre: true } },
      },
      orderBy: [{ perfil: { nombre: "asc" } }, { descripcion: "asc" }],
    }),
  ]);

  const TABS = [
    { key: "abiertas",   label: `Abiertas${cuentaAbiertas > 0 ? ` (${cuentaAbiertas})` : ""}` },
    { key: "resueltas",  label: "Resueltas" },
    { key: "todas",      label: "Todas" },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitudes de mantenimiento</h1>
          <p className="text-slate-400 text-sm mt-1">
            Asistencias técnicas solicitadas por los clientes.
          </p>
        </div>
        <NuevaSolicitudAdminDialog cuentas={cuentasActivas.map((c) => ({
          id: c.id,
          descripcion: c.descripcion,
          softguard_ref: c.softguard_ref,
          perfilNombre: c.perfil.nombre,
        }))} />
      </div>

      {/* Tabs de filtro */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit border border-slate-700">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/mantenimiento?estado=${tab.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroEstado === tab.key
                ? "bg-slate-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
          <p className="text-slate-400">No hay solicitudes en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => {
            const estado = ESTADO_CONFIG[s.estado] ?? { label: s.estado, cls: "bg-slate-700 text-slate-300 border-slate-600" };
            const prioridad = PRIORIDAD_CONFIG[s.prioridad] ?? { label: s.prioridad, cls: "text-slate-400" };

            return (
              <div key={s.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <Link
                      href={`/admin/clientes/${s.cuenta.perfil.id}`}
                      className="font-semibold text-white hover:text-orange-400 transition-colors"
                    >
                      {s.cuenta.perfil.nombre}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.cuenta.descripcion} · {s.cuenta.softguard_ref}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${estado.cls}`}>
                      {estado.label}
                    </span>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-slate-300 text-sm mb-3 leading-relaxed">{s.descripcion}</p>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4">
                  <span>
                    Prioridad:{" "}
                    <span className={prioridad.cls}>{prioridad.label}</span>
                  </span>
                  <span>
                    {new Date(s.creada_en).toLocaleDateString("es-AR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                  {s.cuenta.perfil.telefono && (
                    <a
                      href={`https://wa.me/549${s.cuenta.perfil.telefono}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      WhatsApp → {s.cuenta.perfil.telefono}
                    </a>
                  )}
                  {s.resuelta_en && (
                    <span className="text-green-500">
                      Resuelta el{" "}
                      {new Date(s.resuelta_en).toLocaleDateString("es-AR", {
                        day: "numeric", month: "short",
                      })}
                    </span>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-4">
                  {s.estado === "PENDIENTE" && (
                    <>
                      <IniciarButton id={s.id} />
                      <ResolverButton id={s.id} />
                    </>
                  )}
                  {s.estado === "EN_PROCESO" && (
                    <ResolverButton id={s.id} />
                  )}
                  {s.estado === "RESUELTA" && (
                    <ReopenButton id={s.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

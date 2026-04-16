import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { SolicitudCambioForm } from "@/components/portal/SolicitudCambioForm";

const CATEGORIA_LABEL: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma y monitoreo",
  DOMOTICA: "Domótica",
  CAMARA_CCTV: "Cámaras CCTV",
  ANTENA_STARLINK: "Antena StarLink",
  OTRO: "Otro",
};

const TIPO_TITULAR_LABEL: Record<string, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
  OFICINAS: "Oficinas",
  VEHICULO: "Vehículo",
};

const ESTADO_CAMBIO_ESTILOS: Record<string, string> = {
  PENDIENTE: "bg-amber-900/40 text-amber-400",
  APROBADO: "bg-green-900/40 text-green-400",
  RECHAZADO: "bg-red-900/40 text-red-400",
};

const CAMPO_LABEL: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({
    where: { id: user.id },
    include: {
      solicitudes_cambio: {
        orderBy: { created_at: "desc" },
        take: 30,
      },
      cuentas: {
        where: { estado: { not: "BAJA_DEFINITIVA" } },
        select: {
          id: true,
          descripcion: true,
          softguard_ref: true,
          calle: true,
          localidad: true,
          provincia: true,
          codigo_postal: true,
          categoria: true,
          estado: true,
        },
        orderBy: { descripcion: "asc" },
      },
    },
  });

  if (!perfil) redirect("/login");

  // Determinar qué campos tienen solicitud pendiente
  const pendientesPorCampo = new Set(
    perfil.solicitudes_cambio
      .filter((s) => s.estado === "PENDIENTE")
      .map((s) => s.campo)
  );

  const camposEditables: { campo: "nombre" | "telefono" | "email"; label: string; valor: string | null }[] = [
    { campo: "nombre", label: "Nombre completo", valor: perfil.nombre },
    { campo: "telefono", label: "Teléfono", valor: perfil.telefono ?? null },
    { campo: "email", label: "Email", valor: perfil.email ?? null },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Mi perfil</h1>
        <p className="text-slate-400 text-sm">
          Tu información personal registrada con Escobar Instalaciones.
        </p>
      </div>

      {/* ── Datos de contacto ─────────────────────────────────────────────── */}
      <section aria-labelledby="contacto-heading">
        <h2 id="contacto-heading" className="text-lg font-semibold text-white mb-4">
          Datos de contacto
        </h2>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 divide-y divide-slate-700">
          {/* DNI — solo lectura */}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-0.5">DNI</p>
              <p className="text-white font-medium">{perfil.dni ?? "—"}</p>
            </div>
            <span className="text-xs text-slate-500 italic">No modificable</span>
          </div>

          {/* Tipo de titular — solo lectura */}
          {perfil.tipo_titular && (
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-xs font-medium text-slate-400 mb-0.5">Tipo de titular</p>
                <p className="text-white font-medium">
                  {TIPO_TITULAR_LABEL[perfil.tipo_titular]}
                </p>
              </div>
              <span className="text-xs text-slate-500 italic">No modificable</span>
            </div>
          )}

          {/* Campos editables */}
          {camposEditables.map(({ campo, label, valor }) => (
            <div key={campo} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">{label}</p>
                  <p className="text-white font-medium truncate">
                    {valor ?? <span className="text-slate-500 italic">Sin registrar</span>}
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <SolicitudCambioForm
                    campo={campo}
                    campoLabel={label}
                    valorActual={valor}
                    tienePendiente={pendientesPorCampo.has(campo)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Los cambios solicitados son revisados por el equipo de Escobar Instalaciones antes de aplicarse.
        </p>
      </section>

      {/* ── Mis instalaciones ─────────────────────────────────────────────── */}
      {perfil.cuentas.length > 0 && (
        <section aria-labelledby="instalaciones-heading">
          <h2 id="instalaciones-heading" className="text-lg font-semibold text-white mb-4">
            Mis instalaciones
          </h2>

          <div className="space-y-3">
            {perfil.cuentas.map((cuenta) => {
              const tieneDir = cuenta.calle || cuenta.localidad || cuenta.provincia;
              return (
                <div
                  key={cuenta.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4"
                >
                  <div className="mb-3">
                    <p className="font-semibold text-white">{cuenta.descripcion}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {CATEGORIA_LABEL[cuenta.categoria]} · Ref: {cuenta.softguard_ref}
                    </p>
                  </div>

                  {tieneDir ? (
                    <address className="not-italic text-sm text-slate-300">
                      {[cuenta.calle, cuenta.localidad, cuenta.provincia, cuenta.codigo_postal]
                        .filter(Boolean)
                        .join(", ")}
                    </address>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Dirección no registrada</p>
                  )}

                  <p className="text-xs text-slate-500 mt-3">
                    Para cambios de dirección, contactá a Escobar Instalaciones.
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Historial de solicitudes ───────────────────────────────────────── */}
      {perfil.solicitudes_cambio.length > 0 && (
        <section aria-labelledby="historial-heading">
          <h2 id="historial-heading" className="text-lg font-semibold text-white mb-4">
            Historial de solicitudes
          </h2>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Campo</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden sm:table-cell">Valor propuesto</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden md:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {perfil.solicitudes_cambio.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-slate-300">
                      {CAMPO_LABEL[s.campo] ?? s.campo}
                    </td>
                    <td className="px-5 py-3 text-slate-300 hidden sm:table-cell truncate max-w-[200px]">
                      {s.valor_nuevo}
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            ESTADO_CAMBIO_ESTILOS[s.estado] ?? "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {s.estado}
                        </span>
                        {s.notas_admin && (
                          <p className="text-xs text-slate-400 mt-1">{s.notas_admin}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 hidden md:table-cell whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

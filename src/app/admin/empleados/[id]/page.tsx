import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { EditarEmpleadoForm } from "@/components/admin/EditarEmpleadoForm";

export const metadata = { title: "Editar empleado — Admin" };

const ROL_PERFIL_LABEL: Record<string, string> = {
  ADMIN:   "Administrador (acceso completo)",
  TECNICO: "Técnico / Empleado",
};

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const perfil = await prisma.perfil.findUnique({
    where: { id },
    include: { empleado: true },
  });

  if (!perfil || !perfil.empleado) notFound();

  const emp = perfil.empleado;

  return (
    <div className="max-w-xl space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/empleados" className="hover:text-white transition-colors">
              Empleados
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium">{perfil.nombre}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-slate-600"
          style={{ backgroundColor: emp.color_calendario ?? "#6366f1" }}
          aria-hidden="true"
        />
        <div>
          <h1 className="text-2xl font-bold text-white">{perfil.nombre}</h1>
          <p className="text-sm text-slate-400">
            {ROL_PERFIL_LABEL[perfil.rol] ?? perfil.rol} ·{" "}
            <span className={emp.activo ? "text-emerald-400" : "text-slate-500"}>
              {emp.activo ? "Activo" : "Inactivo"}
            </span>
          </p>
        </div>
      </div>

      {/* WhatsApp rápido */}
      {perfil.telefono && (
        <a
          href={`https://wa.me/${perfil.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${perfil.nombre.split(" ")[0]}, te contactamos de Escobar Instalaciones.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <span aria-hidden="true">📱</span>
          WhatsApp — {perfil.telefono}
        </a>
      )}

      {/* Formulario de edición */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <EditarEmpleadoForm
          empleado={{
            id:               perfil.id,
            nombre:           perfil.nombre,
            dni:              perfil.dni ?? null,
            telefono:         perfil.telefono ?? null,
            email:            perfil.email ?? null,
            activo:           emp.activo,
            rol_empleado:     emp.rol_empleado,
            puede_monitorear: emp.puede_monitorear,
            puede_instalar:   emp.puede_instalar,
            puede_facturar:   emp.puede_facturar,
            color_calendario: emp.color_calendario ?? null,
          }}
        />
      </div>
    </div>
  );
}

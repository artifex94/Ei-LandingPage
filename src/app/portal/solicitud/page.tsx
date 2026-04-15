import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { SolicitudForm } from "./SolicitudForm";

export default async function SolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>;
}) {
  const { cuenta: cuentaPreId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: user.id, estado: { in: ["ACTIVA", "EN_MANTENIMIENTO"] } },
    select: { id: true, descripcion: true },
    orderBy: { descripcion: "asc" },
  });

  if (cuentas.length === 0) {
    return (
      <section>
        <h1 className="text-2xl font-bold text-white mb-4">
          Solicitar asistencia
        </h1>
        <p className="text-slate-400">No tenés servicios activos para solicitar asistencia.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="solicitud-heading">
      <h1 id="solicitud-heading" className="text-2xl font-bold text-white mb-2">
        Solicitar asistencia técnica
      </h1>
      <p className="text-slate-400 mb-8">
        Describí el problema y nos comunicamos a la brevedad.
      </p>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-xl">
        <SolicitudForm cuentas={cuentas} cuentaPreId={cuentaPreId} />
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { iniciarImpersonacion } from "@/lib/actions/impersonacion";

/**
 * Puerta de entrada a la impersonación desde /admin/clientes.
 *
 * Antes esta ruta era una réplica manual de ~700 líneas del portal (siempre
 * desfasada de las páginas reales /portal/*). Ahora es solo una confirmación:
 * el admin confirma, `iniciarImpersonacion` setea la cookie firmada y
 * redirige a /portal/dashboard — el admin ve el portal REAL, no una copia.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ perfilId: string }>;
}): Promise<Metadata> {
  const { perfilId } = await params;
  const perfil = await prisma.perfil.findUnique({ where: { id: perfilId }, select: { nombre: true } });
  return { title: perfil?.nombre ? `Ver portal — ${perfil.nombre}` : "Ver portal" };
}

export default async function VistaClientePage({
  params,
}: {
  params: Promise<{ perfilId: string }>;
}) {
  await requireAdmin();

  const { perfilId } = await params;
  const perfil = await prisma.perfil.findUnique({
    where: { id: perfilId, rol: "CLIENTE" },
    select: { id: true, nombre: true },
  });
  if (!perfil) notFound();

  const iniciarConId = iniciarImpersonacion.bind(null, perfil.id);

  return (
    <div className="max-w-lg mx-auto py-16">
      <nav aria-label="Ruta de navegación" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/clientes" className="hover:text-white transition-colors">
              Clientes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/admin/clientes/${perfil.id}`} className="hover:text-white transition-colors">
              {perfil.nombre}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-white font-medium">Ver portal</li>
        </ol>
      </nav>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
        <span className="inline-block text-xs font-bold bg-orange-500 text-slate-900 px-2 py-0.5 rounded uppercase tracking-wide mb-4">
          Vista admin
        </span>
        <h1 className="text-xl font-bold text-white mb-2">
          Vas a entrar al portal de {perfil.nombre}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Vas a ver exactamente lo mismo que ve el cliente en Mi Central, en
          modo solo lectura. Un banner naranja te va a permitir salir en
          cualquier momento.
        </p>
        <form action={iniciarConId} className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href={`/admin/clientes/${perfil.id}`}
            className="inline-flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-lg border border-slate-600 transition-colors min-h-[44px]"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-400 text-slate-900 font-bold px-6 py-3 rounded-lg transition-colors min-h-[44px]"
          >
            Entrar al portal como {perfil.nombre.split(" ")[0]}
          </button>
        </form>
      </div>
    </div>
  );
}

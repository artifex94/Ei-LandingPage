import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { CalendarioTurnos } from "@/components/admin/turnos/CalendarioTurnos";

export const metadata: Metadata = { title: "Turnos — Admin" };

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function parseSemana(raw?: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana: semanaParam } = await searchParams;
  const hoy = new Date();
  const lunes = parseSemana(semanaParam) ?? startOfWeek(hoy);
  lunes.setHours(0, 0, 0, 0);
  const domingo = addDays(lunes, 6);

  const semanaAnterior  = addDays(lunes, -7).toISOString().slice(0, 10);
  const semanaSiguiente = addDays(lunes,  7).toISOString().slice(0, 10);

  const [empleados, turnos] = await Promise.all([
    prisma.empleado.findMany({
      where: { activo: true, puede_monitorear: true },
      include: { perfil: { select: { id: true, nombre: true } } },
      orderBy: { created_at: "asc" },
    }),
    prisma.turno.findMany({
      where: { fecha: { gte: lunes, lte: domingo } },
      include: { empleado: { include: { perfil: { select: { id: true, nombre: true } } } } },
      orderBy: [{ fecha: "asc" }, { franja: "asc" }],
    }),
  ]);

  const lunesLabel   = lunes.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  const domingoLabel = domingo.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Encabezado + navegación de semanas */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Turnos de monitoreo</h1>
          <p className="text-sm text-slate-400 mt-1">
            {lunesLabel} – {domingoLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/admin/turnos?semana=${semanaAnterior}`}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] flex items-center"
          >
            ← Anterior
          </a>
          <a
            href="/admin/turnos"
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] flex items-center"
          >
            Hoy
          </a>
          <a
            href={`/admin/turnos?semana=${semanaSiguiente}`}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] flex items-center"
          >
            Siguiente →
          </a>
        </div>
      </div>

      {empleados.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center">
          <p className="text-slate-300 font-medium">No hay monitores activos.</p>
          <p className="text-sm text-slate-500 mt-2">
            Habilitá empleados como monitores en{" "}
            <a href="/admin/empleados" className="text-orange-400 underline">
              Empleados
            </a>
            .
          </p>
        </div>
      ) : (
        <CalendarioTurnos
          empleados={empleados}
          turnos={turnos}
          semanaDesde={lunes.toISOString().slice(0, 10)}
          hoyIso={hoy.toISOString().slice(0, 10)}
        />
      )}
    </div>
  );
}

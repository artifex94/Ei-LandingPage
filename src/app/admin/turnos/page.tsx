import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { CalendarioTurnos } from "@/components/admin/turnos/CalendarioTurnos";
import { AutoAsignarButton } from "@/components/admin/turnos/AutoAsignarButton";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_TURNOS = [
  {
    titulo: "Qué es un turno",
    descripcion: "Un turno asigna a un operador de monitoreo a una franja horaria (mañana, tarde o noche) en un día específico.",
  },
  {
    titulo: "Cobertura completa",
    descripcion: "El sistema alerta si algún día de la semana queda sin cobertura en alguna franja. Tres turnos por día = cobertura 24h.",
  },
  {
    titulo: "Crear y editar turnos",
    descripcion: "Hacé clic en una celda vacía del calendario para asignar un turno. Hacé clic en uno existente para editar o eliminar.",
  },
  {
    titulo: "Ausencias",
    descripcion: "Si un operador falta, registralo en Ausencias. El turno queda marcado visualmente como cubierto por otro o vacío.",
  },
];

export const metadata: Metadata = { title: "Turnos" };

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

  // Huecos de cobertura de la semana visible: 7 días × 3 franjas = 21 slots.
  const FRANJAS = ["MANANA", "TARDE", "NOCHE"] as const;
  const cubiertos = new Set(
    turnos
      .filter((t) => t.estado === "PROGRAMADO" || t.estado === "EN_CURSO")
      .map((t) => `${new Date(t.fecha).toISOString().slice(0, 10)}|${t.franja}`)
  );
  let huecos = 0;
  for (let i = 0; i < 7; i++) {
    const dia = addDays(lunes, i).toISOString().slice(0, 10);
    for (const f of FRANJAS) {
      if (!cubiertos.has(`${dia}|${f}`)) huecos++;
    }
  }
  const semanaIso = lunes.toISOString().slice(0, 10);

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

        <div className="flex items-center gap-2 flex-wrap">
          {empleados.length > 0 && (
            <AutoAsignarButton semanaDesde={semanaIso} huecos={huecos} />
          )}
          <div className="flex items-center gap-2">
            <a
              href={`/admin/turnos?semana=${semanaAnterior}`}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center"
            >
              ← Anterior
            </a>
            <a
              href="/admin/turnos"
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center"
            >
              Hoy
            </a>
            <a
              href={`/admin/turnos?semana=${semanaSiguiente}`}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center"
            >
              Siguiente →
            </a>
          </div>
        </div>
      </div>

      {empleados.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center">
          <p className="text-slate-300 font-medium">No hay monitores activos.</p>
          <p className="text-sm text-slate-500 mt-2">
            Habilitá empleados como monitores en{" "}
            <Link href="/admin/empleados" className="text-orange-400 underline">
              Empleados
            </Link>
            .
          </p>
        </div>
      ) : (
        <CalendarioTurnos
          key={`${semanaIso}-${turnos.length}`}
          empleados={empleados}
          turnos={turnos}
          semanaDesde={lunes.toISOString().slice(0, 10)}
          hoyIso={hoy.toISOString().slice(0, 10)}
        />
      )}

      <TutorialContextual
        section="turnos"
        titulo="Guía rápida — Turnos"
        steps={TUTORIAL_TURNOS}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { marcarCompletada, guardarNotas } from "./actions";

const PRIORIDAD_BADGE: Record<string, string> = {
  ALTA:  "bg-red-500/20 text-red-300",
  MEDIA: "bg-amber-500/20 text-amber-300",
  BAJA:  "bg-slate-700 text-slate-400",
};
const PRIORIDAD_LABEL: Record<string, string> = {
  ALTA: "⚡ Urgente", MEDIA: "Media", BAJA: "Baja",
};
const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  "bg-slate-700 text-slate-300",
  EN_CURSO:   "bg-blue-500/20 text-blue-300",
  COMPLETADA: "bg-emerald-500/20 text-emerald-300",
  CANCELADA:  "bg-red-500/20 text-red-400",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente", EN_CURSO: "En curso",
  COMPLETADA: "Completada", CANCELADA: "Cancelada",
};

export default async function TareaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tarea = await prisma.tareaAgendada.findUnique({
    where: { id },
    include: {
      cuenta: {
        select: {
          calle: true,
          localidad: true,
          provincia: true,
          perfil: { select: { nombre: true, telefono: true } },
        },
      },
    },
  });

  if (!tarea || tarea.tecnico_id !== user.id) notFound();

  const fechaFormateada = format(new Date(tarea.fecha), "EEEE d 'de' MMMM", { locale: es });
  const mapsQuery = [tarea.cuenta?.calle, tarea.cuenta?.localidad, tarea.cuenta?.provincia]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`;

  const contactoNombre = tarea.cuenta?.perfil?.nombre;
  const contactoTel = tarea.cuenta?.perfil?.telefono;
  const telDigits = contactoTel?.replace(/\D/g, "");

  const yaCompletada = tarea.estado === "COMPLETADA" || tarea.estado === "CANCELADA";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/tecnico/dashboard"
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← Volver
        </Link>
      </div>

      {/* Cabecera */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold text-white leading-snug">{tarea.titulo}</h1>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[tarea.estado]}`}>
              {ESTADO_LABEL[tarea.estado]}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORIDAD_BADGE[tarea.prioridad]}`}>
              {PRIORIDAD_LABEL[tarea.prioridad]}
            </span>
          </div>
        </div>

        <div className="text-sm text-slate-300 capitalize">{fechaFormateada}</div>
        {(tarea.hora_inicio || tarea.hora_fin) && (
          <div className="text-sm font-bold text-white bg-slate-700 inline-block px-2 py-0.5 rounded">
            {tarea.hora_inicio ?? "?"}{tarea.hora_fin ? ` – ${tarea.hora_fin}` : ""}
          </div>
        )}
        {tarea.descripcion && (
          <p className="text-sm text-slate-400 leading-relaxed">{tarea.descripcion}</p>
        )}
      </div>

      {/* Dirección */}
      {tarea.cuenta && (mapsQuery) && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Dónde
          </p>
          <p className="text-sm text-white">
            {[tarea.cuenta.calle, tarea.cuenta.localidad].filter(Boolean).join(", ")}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Ver en Google Maps ↗
          </a>
        </div>
      )}

      {/* Contacto */}
      {(contactoNombre || contactoTel) && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Contacto
          </p>
          {contactoNombre && (
            <p className="text-sm font-semibold text-white">{contactoNombre}</p>
          )}
          {contactoTel && telDigits && (
            <div className="flex gap-2 flex-wrap">
              <a
                href={`tel:+549${telDigits}`}
                className="flex-1 min-w-[120px] text-center text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors"
              >
                📞 Llamar
              </a>
              <a
                href={`https://wa.me/549${telDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[120px] text-center text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg transition-colors"
              >
                WhatsApp ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Notas del técnico */}
      {!yaCompletada && (
        <form
          className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3"
          action={async (fd) => {
            "use server";
            await guardarNotas(id, fd.get("notas") as string);
          }}
        >
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Notas del trabajo
          </label>
          <textarea
            name="notas"
            defaultValue={tarea.notas_tecnico ?? ""}
            rows={3}
            placeholder="Observaciones, materiales usados, etc."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            type="submit"
            className="w-full text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors"
          >
            Guardar notas
          </button>
        </form>
      )}

      {tarea.notas_tecnico && yaCompletada && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notas</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{tarea.notas_tecnico}</p>
        </div>
      )}

      {/* Acción principal */}
      {!yaCompletada && (
        <form
          action={async () => {
            "use server";
            await marcarCompletada(id);
          }}
        >
          <button
            type="submit"
            className="w-full text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3.5 rounded-xl transition-colors active:scale-[0.98]"
          >
            ✓ Marcar como completada
          </button>
        </form>
      )}

      {yaCompletada && (
        <div className="text-center py-3">
          <span className="text-sm text-emerald-400 font-semibold">
            {tarea.estado === "COMPLETADA" ? "✓ Tarea completada" : "Tarea cancelada"}
          </span>
        </div>
      )}
    </div>
  );
}

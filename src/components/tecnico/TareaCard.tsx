import Link from "next/link";

interface TareaCardProps {
  id: string;
  titulo: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  prioridad: "BAJA" | "MEDIA" | "ALTA";
  calle: string | null;
  localidad: string | null;
}

const PRIORIDAD_BADGE: Record<string, string> = {
  ALTA:  "bg-red-500/20 text-red-300 ring-1 ring-red-500/40",
  MEDIA: "bg-amber-500/20 text-amber-300",
  BAJA:  "bg-slate-700 text-slate-400",
};

const PRIORIDAD_LABEL: Record<string, string> = {
  ALTA: "⚡ Urgente", MEDIA: "Media", BAJA: "Baja",
};

export function TareaCard({ id, titulo, hora_inicio, hora_fin, prioridad, calle, localidad }: TareaCardProps) {
  const direccion = [calle, localidad].filter(Boolean).join(", ");

  return (
    <Link
      href={`/tecnico/tareas/${id}`}
      className="block rounded-xl border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700/60 transition-colors active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {(hora_inicio || hora_fin) && (
            <p className="text-xs font-bold text-white bg-slate-700 inline-block px-2 py-0.5 rounded mb-1.5">
              {hora_inicio ?? "?"}{hora_fin ? ` – ${hora_fin}` : ""}
            </p>
          )}
          <p className="font-semibold text-white leading-snug">{titulo}</p>
          {direccion && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{direccion}</p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORIDAD_BADGE[prioridad]}`}>
          {PRIORIDAD_LABEL[prioridad]}
        </span>
      </div>
    </Link>
  );
}

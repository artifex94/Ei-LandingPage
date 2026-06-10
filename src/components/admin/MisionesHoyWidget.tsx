import Link from "next/link";

interface Props {
  eventosSinProcesar: number;
  pendingMantenimiento: number;
  cambiosPendientes: number;
  altasUsuarioPendientes: number;
  sinTurnos: boolean;
  cuentasEnMora: number;
}

interface Item {
  id: string;
  texto: string;
  href: string;
  critico: boolean;
}

export function MisionesHoyWidget({
  eventosSinProcesar,
  pendingMantenimiento,
  cambiosPendientes,
  altasUsuarioPendientes,
  sinTurnos,
  cuentasEnMora,
}: Props) {
  const items: Item[] = [
    ...(eventosSinProcesar > 0
      ? [{
          id: "eventos",
          texto: `${eventosSinProcesar} evento${eventosSinProcesar > 1 ? "s" : ""} sin procesar`,
          href: "/admin/eventos?estado=NUEVO",
          critico: true,
        }]
      : []),
    ...(altasUsuarioPendientes > 0
      ? [{
          id: "altas",
          texto: `${altasUsuarioPendientes} solicitud${altasUsuarioPendientes > 1 ? "es" : ""} de alta`,
          href: "/admin/solicitudes-alta",
          critico: false,
        }]
      : []),
    ...(pendingMantenimiento > 0
      ? [{
          id: "mantenimiento",
          texto: `${pendingMantenimiento} de mantenimiento`,
          href: "/admin/mantenimiento",
          critico: false,
        }]
      : []),
    ...(cuentasEnMora > 0
      ? [{
          id: "mora",
          texto: `${cuentasEnMora} cuenta${cuentasEnMora > 1 ? "s" : ""} en mora`,
          href: "/admin/morosidad",
          critico: false,
        }]
      : []),
    ...(cambiosPendientes > 0
      ? [{
          id: "cambios",
          texto: `${cambiosPendientes} cambio${cambiosPendientes > 1 ? "s" : ""} de datos`,
          href: "/admin/solicitudes-cambio",
          critico: false,
        }]
      : []),
    ...(sinTurnos
      ? [{
          id: "turnos",
          texto: "Sin turnos asignados hoy",
          href: "/admin/turnos",
          critico: false,
        }]
      : []),
  ];

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-600">Sin pendientes urgentes.</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-opacity hover:opacity-90 ${
            item.critico
              ? "border-red-800/40 bg-red-950/20 text-red-300"
              : "border-amber-800/30 bg-amber-950/10 text-amber-400/80"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                item.critico ? "bg-red-500 animate-led-crit" : "bg-amber-600"
              }`}
              aria-hidden="true"
            />
            <span className="font-medium">{item.texto}</span>
          </div>
          <span className="text-xs opacity-60 shrink-0">Ver →</span>
        </Link>
      ))}
    </div>
  );
}

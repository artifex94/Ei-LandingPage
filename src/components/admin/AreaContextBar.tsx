"use client";

import { usePathname } from "next/navigation";

interface AreaDef {
  label: string;
  dot: string;
  text: string;
  border: string; // left border color (inline style value)
}

const AREAS: Record<string, AreaDef> = {
  pendientes: {
    label: "Pendientes",
    dot:  "bg-rose-500",
    text: "text-rose-400",
    border: "rgba(244,63,94,0.4)",
  },
  operacion: {
    label: "Operación",
    dot:  "bg-indigo-500",
    text: "text-indigo-400",
    border: "rgba(99,102,241,0.4)",
  },
  clientes: {
    label: "Clientes",
    dot:  "bg-blue-500",
    text: "text-blue-400",
    border: "rgba(59,130,246,0.4)",
  },
  equipo: {
    label: "Equipo",
    dot:  "bg-amber-500",
    text: "text-amber-400",
    border: "rgba(245,158,11,0.4)",
  },
  sistema: {
    label: "Sistema",
    dot:  "bg-slate-400",
    text: "text-slate-400",
    border: "rgba(148,163,184,0.3)",
  },
};

const PATH_MAP: [string, keyof typeof AREAS][] = [
  ["/admin/eventos",            "pendientes"],
  ["/admin/solicitudes-alta",   "pendientes"],
  ["/admin/mantenimiento",      "pendientes"],
  ["/admin/solicitudes-cambio", "pendientes"],
  ["/admin/monitoreo",          "operacion"],
  ["/admin/ot",                 "operacion"],
  ["/admin/agenda",             "operacion"],
  ["/admin/turnos",             "operacion"],
  ["/admin/ausencias",          "operacion"],
  ["/admin/clientes",           "clientes"],
  ["/admin/cuentas",            "clientes"],
  ["/admin/morosidad",          "clientes"],
  ["/admin/vista-cliente",      "clientes"],
  ["/admin/pagos",              "clientes"],
  ["/admin/facturacion",        "clientes"],
  ["/admin/trabajadores",       "equipo"],
  ["/admin/empleados",          "equipo"],
  ["/admin/vehiculo",           "equipo"],
  ["/admin/importar",           "sistema"],
  ["/admin/higienizar",         "sistema"],
  ["/admin/auditoria",          "sistema"],
  ["/admin/sync-softguard",     "sistema"],
  ["/admin/configuracion",      "sistema"],
];

export function AreaContextBar() {
  const pathname = usePathname();

  if (pathname === "/admin/dashboard") return null;

  const match = PATH_MAP.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  if (!match) return null;

  const area = AREAS[match[1]];

  return (
    <div
      className="flex items-center gap-2.5 mb-5 pl-3 py-0.5"
      style={{ borderLeft: `2px solid ${area.border}` }}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${area.dot}`} aria-hidden="true" />
      <span className={`text-[10px] font-bold uppercase tracking-widest ${area.text}`}>
        {area.label}
      </span>
    </div>
  );
}

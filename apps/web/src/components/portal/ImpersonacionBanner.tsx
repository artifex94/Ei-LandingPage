import { Eye, LogOut } from "lucide-react";
import { terminarImpersonacion } from "@/lib/actions/impersonacion";

/**
 * Banner fijo de "vista admin" — se muestra en TODO /portal/* cuando un
 * ADMIN está impersonando a un cliente. Naranja (nunca rojo, ver
 * convención AegisCore), z-index por encima del PagoRequeridoGuard (modal
 * z-50) para que el botón "Salir" siempre esté accesible aunque el cliente
 * impersonado esté SUSPENDED.
 *
 * Triple canal de accesibilidad: color (naranja) + ícono (ojo) + texto.
 * Server component + form action — sin JS extra en el cliente.
 */
export function ImpersonacionBanner({ clienteNombre }: { clienteNombre: string }) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] h-10 flex items-center gap-2 bg-orange-950/95
                 border-b border-orange-700/50 px-3 backdrop-blur-xl sm:px-4"
    >
      <Eye aria-hidden="true" className="w-4 h-4 text-orange-400 shrink-0" strokeWidth={2} />
      <span className="shrink-0 text-[10px] sm:text-xs font-bold bg-orange-500 text-slate-900 px-1.5 py-0.5 rounded uppercase tracking-wide">
        Vista admin
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] sm:text-xs text-orange-200">
        Estás viendo el portal como{" "}
        <strong className="font-semibold text-orange-100">{clienteNombre}</strong> — solo lectura
      </span>
      <form action={terminarImpersonacion} className="shrink-0">
        <button
          type="submit"
          className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-orange-100
                     hover:text-white bg-orange-800/60 hover:bg-orange-800 px-2.5 py-1 rounded-lg
                     border border-orange-700/50 transition-colors min-h-[28px]"
        >
          <LogOut aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
          <span className="hidden sm:inline">Salir de la vista</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </form>
    </div>
  );
}

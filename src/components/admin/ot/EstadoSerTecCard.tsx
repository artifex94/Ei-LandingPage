/**
 * Estado REAL de la orden en la central (módulo Servicio Técnico de SoftGuard),
 * para el detalle de OT cuando tiene `st_softguard_numero`.
 *
 * RSC async: se monta dentro de <Suspense> en la página para que la consulta a
 * la central (con su latencia y posibles microcortes) no bloquee el resto del
 * detalle. Si la central no responde, degrada a un aviso — nunca rompe.
 *
 * Usa fetchOrdenesServicio() y matchea por número en memoria (mismo criterio
 * que syncEstadoOTWebApi): no inventamos filtros del API no validados.
 */

import { softguardWebApiConfigured, fetchOrdenesServicio, type WebOrdenServicio } from "@/lib/softguard/api";

function fechaCorta(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function EstadoSerTecCard({ numero }: { numero: number }) {
  if (!softguardWebApiConfigured()) return null;

  let orden: WebOrdenServicio | null = null;
  let sinConexion = false;
  let vencida = false;
  try {
    const ordenes = await fetchOrdenesServicio({ limit: 1000 });
    orden = ordenes.find((o) => o.numero === numero) ?? null;
    const ahora = new Date();
    vencida = Boolean(orden?.activa && orden.vencimiento && orden.vencimiento < ahora);
  } catch {
    sinConexion = true;
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        SoftGuard — Servicio Técnico (orden #{numero})
      </h3>

      {sinConexion && (
        <p className="text-sm text-red-400/80">
          Sin conexión con la central — no se pudo consultar el estado de la orden.
        </p>
      )}

      {!sinConexion && !orden && (
        <p className="text-sm text-slate-500">
          La orden #{numero} no aparece entre las visibles de la central.
        </p>
      )}

      {orden && (
        <div className="space-y-1.5 text-sm">
          <p>
            {orden.cerrada ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                Cerrada en la central
                {orden.fecha_cierre && ` — ${fechaCorta(orden.fecha_cierre)}`}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">
                Abierta en la central
              </span>
            )}
            <span className="text-xs text-slate-600 ml-2">estado {orden.estado_raw}</span>
          </p>

          {orden.vencimiento && (
            <p className={vencida ? "text-red-300 font-semibold" : "text-slate-300"}>
              Vencimiento: {fechaCorta(orden.vencimiento)}
              {vencida && " — VENCIDA"}
            </p>
          )}

          {orden.tecnico && (
            <p className="text-xs text-slate-400">Técnico en la central: {orden.tecnico}</p>
          )}

          {orden.observaciones && (
            <p className="text-xs text-slate-500 line-clamp-2" title={orden.observaciones}>
              {orden.observaciones}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

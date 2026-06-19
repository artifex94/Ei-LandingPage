import Link from "next/link";

/**
 * Tarjeta "Estado de tu sistema" del dashboard del cliente (Fase 4 — capa
 * cliente de la fachada SoftGuard).
 *
 * Muestra, desde la proyección sg_* de SUS cuentas (sin pegarle a la central):
 * - todo OK → reportando con normalidad + último test recibido;
 * - fallo de alimentación o de reporte → aviso en lenguaje del cliente, con
 *   el enganche de la Fase 3: si ya hay una solicitud/OT abierta dice que la
 *   visita está en gestión; si no, CTA para reportar el problema.
 *
 * Si ninguna cuenta tiene datos sincronizados todavía, no se renderiza.
 */

export interface CuentaEstadoSistema {
  id: string;
  descripcion: string;
  sincronizada: boolean;
  enFalloAc: boolean;
  falloAcDesde: Date | null;
  enFalloTst: boolean;
  falloTstDesde: Date | null;
  ultimoTst: Date | null;
  /** Ya hay una solicitud de mantenimiento u OT abierta para esta cuenta. */
  enGestion: boolean;
}

// Formato fijo dd/mm HH:mm — el ICU del runtime no es confiable para locales.
function fechaCorta(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EstadoSistemaCard({ cuentas }: { cuentas: CuentaEstadoSistema[] }) {
  const conDatos = cuentas.filter((c) => c.sincronizada);
  if (conDatos.length === 0) return null;

  const enFallo = conDatos.filter((c) => c.enFalloAc || c.enFalloTst);
  const todasOk = enFallo.length === 0;
  const hayCorteAc = enFallo.some((c) => c.enFalloAc);

  const led = todasOk
    ? { color: "bg-emerald-400", anim: "animate-led-ok", borde: "border-industrial-700" }
    : hayCorteAc
      ? { color: "bg-red-500", anim: "animate-led-crit", borde: "border-red-800/60" }
      : { color: "bg-amber-400", anim: "animate-led-warn", borde: "border-amber-800/60" };

  const ultimoTest = conDatos
    .map((c) => c.ultimoTst)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <section
      aria-labelledby="estado-sistema-heading"
      className={`mb-6 rounded-lg border ${led.borde} bg-industrial-800/80 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${led.color} ${led.anim} flex-shrink-0`}
          aria-hidden="true"
        />
        <h2
          id="estado-sistema-heading"
          className="text-xs text-slate-400 font-mono tracking-widest uppercase"
        >
          Estado de tu sistema
        </h2>
      </div>

      {todasOk ? (
        <div>
          <p className="text-emerald-400 font-semibold text-sm">
            ✓ {conDatos.length === 1
              ? "Tu sistema está reportando con normalidad a la central."
              : `Tus ${conDatos.length} sistemas están reportando con normalidad a la central.`}
          </p>
          {ultimoTest && (
            <p className="text-xs text-slate-500 mt-1.5">
              Último test recibido: {fechaCorta(ultimoTest)}
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {enFallo.map((c) => (
            <li key={c.id}>
              {c.enFalloAc && (
                <p className="text-sm font-semibold text-red-300">
                  ⚠ «{c.descripcion}» está funcionando a batería
                  {c.falloAcDesde && (
                    <span className="font-normal text-red-400/80">
                      {" "}— sin 220v desde el {fechaCorta(c.falloAcDesde)}
                    </span>
                  )}
                </p>
              )}
              {c.enFalloAc && (
                <p className="text-xs text-slate-400 mt-1">
                  Verificá la llave térmica o el transformador del panel. Si no se
                  restablece, la batería tiene una autonomía limitada.
                </p>
              )}
              {c.enFalloTst && (
                <p className={`text-sm font-semibold text-amber-300 ${c.enFalloAc ? "mt-2" : ""}`}>
                  ⚠ «{c.descripcion}» no se está reportando a la central
                  {c.falloTstDesde && (
                    <span className="font-normal text-amber-400/80">
                      {" "}desde el {fechaCorta(c.falloTstDesde)}
                    </span>
                  )}
                </p>
              )}

              <div className="mt-2.5">
                {c.enGestion ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700/50 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    Visita técnica en gestión
                  </span>
                ) : (
                  <Link
                    href="/portal/solicitud"
                    className="inline-flex items-center gap-2 bg-tactical-500 hover:bg-tactical-400
                               text-slate-900 px-4 py-2 rounded-sm font-bold uppercase text-xs tracking-widest
                               border border-tactical-600 border-b-[3px] border-b-tactical-600
                               transition-all duration-150 ease-mech-press
                               active:border-b-[1px] active:translate-y-[2px] min-h-[40px]"
                  >
                    Solicitar visita técnica
                  </Link>
                )}
              </div>
            </li>
          ))}

          {conDatos.length > enFallo.length && (
            <li className="text-xs text-slate-500 pt-1 border-t border-industrial-700/50">
              El resto de tus servicios reporta con normalidad.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

import type { Metadata } from "next";
import { getCuentaCount } from "@/lib/softguard/queries";
import { isMockMode } from "@/lib/softguard/client";
import { SoftGuardPingPanel } from "@/components/admin/SoftGuardSyncStatus";

export const metadata: Metadata = {
  title: "Integración SoftGuard — Admin",
};

export default async function SyncSoftGuardPage() {
  const result = await getCuentaCount();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Integración SoftGuard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Estado de la conexión al servidor SQL de SoftGuard. Solo lectura — usuario{" "}
          <code className="text-slate-300">EI_PORTAL_RO</code>.
        </p>
      </div>

      {isMockMode() && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
        >
          <span className="mt-0.5 text-amber-400" aria-hidden="true">⚠</span>
          <p className="text-sm text-amber-300">
            <strong className="font-semibold">Modo mock activo.</strong> Los datos mostrados son
            ficticios. Para conectar al SoftGuard real, configurar las variables{" "}
            <code>SOFTGUARD_DB_HOST</code>, <code>SOFTGUARD_DB_PASS</code> y{" "}
            <code>SOFTGUARD_DB_NAME</code> en <code>.env.local</code> y reiniciar.
          </p>
        </div>
      )}

      <SoftGuardPingPanel initialResult={result} />

      <section aria-labelledby="sg-info-heading" className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-3">
        <h2 id="sg-info-heading" className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Variables requeridas
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {[
            ["SOFTGUARD_DB_HOST", "IP/hostname del servidor SQL Server"],
            ["SOFTGUARD_DB_PORT", "Puerto (default 1433)"],
            ["SOFTGUARD_DB_USER", "Usuario read-only (EI_PORTAL_RO)"],
            ["SOFTGUARD_DB_PASS", "Password del usuario"],
            ["SOFTGUARD_DB_NAME", "Nombre de la base de datos SoftGuard"],
          ].map(([key, desc]) => (
            <div key={key} className="contents">
              <dt>
                <code className="text-xs bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">
                  {key}
                </code>
              </dt>
              <dd className="text-slate-400">{desc}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-slate-500 pt-1">
          Ver{" "}
          <code className="text-slate-400">docs/integracion-softguard.md</code>{" "}
          para el script DDL de las vistas y los pasos de configuración en SQL Server.
        </p>
      </section>
    </div>
  );
}

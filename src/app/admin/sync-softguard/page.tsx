import type { Metadata } from "next";
import Link from "next/link";
import { getCuentaCount } from "@/lib/softguard/queries";
import { isMockMode } from "@/lib/softguard/client";
import { SoftGuardPingPanel } from "@/components/admin/SoftGuardSyncStatus";
import { prisma } from "@/lib/prisma/client";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_SOFTGUARD = [
  {
    titulo: "Modo mock vs modo real",
    descripcion: "Mock: los datos vienen de la base de datos local (para desarrollo). Real: conecta directamente a SoftGuard via VPN/LAN.",
  },
  {
    titulo: "Verificar conectividad",
    descripcion: 'El botón "Ping" comprueba si SoftGuard responde. Si falla, verificá que la VPN o la red local estén activas.',
  },
  {
    titulo: "Reimportar datos",
    descripcion: "Si SoftGuard tiene cuentas o cambios nuevos, usá Importar datos para sincronizar. La conexión en tiempo real es solo de lectura.",
  },
];

export const metadata: Metadata = {
  title: "SoftGuard",
};

export default async function SyncSoftGuardPage() {
  const [result, eventosNuevos] = await Promise.all([
    getCuentaCount(),
    prisma.eventoAlarma.count({ where: { estado: "NUEVO" } }),
  ]);

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

      {/* Eventos sin procesar */}
      <Link
        href={`/admin/eventos?estado=NUEVO`}
        className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
          eventosNuevos > 0
            ? "border-red-500/40 bg-red-500/10 hover:bg-red-500/15"
            : "border-slate-700 bg-slate-800/50 hover:bg-slate-800"
        }`}
        aria-label={`${eventosNuevos} evento${eventosNuevos !== 1 ? "s" : ""} sin procesar`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-lg leading-none ${eventosNuevos > 0 ? "text-red-400" : "text-slate-500"}`}
            aria-hidden="true"
          >
            {eventosNuevos > 0 ? "🔴" : "✓"}
          </span>
          <div>
            <p className={`text-sm font-semibold ${eventosNuevos > 0 ? "text-red-300" : "text-slate-300"}`}>
              Eventos sin procesar
            </p>
            <p className="text-xs text-slate-500">
              Estado <span className="font-mono">NUEVO</span> · requieren atención operativa
            </p>
          </div>
        </div>
        {eventosNuevos > 0 ? (
          <span
            className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[28px] text-center"
            role="status"
            aria-live="polite"
          >
            {eventosNuevos}
          </span>
        ) : (
          <span className="text-emerald-400 text-sm font-medium">Al día</span>
        )}
      </Link>

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

      <TutorialContextual
        section="sync-softguard"
        titulo="Guía rápida — SoftGuard"
        steps={TUTORIAL_SOFTGUARD}
      />
    </div>
  );
}

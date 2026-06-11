import type { Metadata } from "next";
import Link from "next/link";
import { softguardWebApiConfigured } from "@/lib/softguard/api";
import { SoftGuardModulosPanel } from "@/components/admin/SoftGuardModulosPanel";
import { prisma } from "@/lib/prisma/client";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_SOFTGUARD = [
  {
    titulo: "Cómo se conecta",
    descripcion: "El portal habla con la suite web de SoftGuard (API REST, puerto 8080) con un usuario dedicado, siempre en modo solo lectura.",
  },
  {
    titulo: "Salud de módulos",
    descripcion: "El panel de abajo sondea cada módulo de la suite (monitoreo, CRM, servicio técnico) y muestra la latencia. Si algo falla, verificá la red local y que la central esté en línea.",
  },
  {
    titulo: "Sincronización automática",
    descripcion: "Un cron sincroniza cuentas, eventos y órdenes de servicio cada pocos minutos. Los eventos sin procesar aparecen arriba.",
  },
];

export const metadata: Metadata = {
  title: "SoftGuard",
};

export default async function SyncSoftGuardPage() {
  const eventosNuevos = await prisma.eventoAlarma.count({ where: { estado: "NUEVO" } });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Integración SoftGuard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Estado de la integración con la suite web de SoftGuard (API REST :8080).
          Solo lectura contra la central.
        </p>
      </div>

      {!softguardWebApiConfigured() && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
        >
          <span className="mt-0.5 text-amber-400" aria-hidden="true">⚠</span>
          <p className="text-sm text-amber-300">
            <strong className="font-semibold">API web sin configurar.</strong> El portal no
            puede hablar con la central. Configurar <code>SOFTGUARD_API_BASE</code>,{" "}
            <code>SOFTGUARD_API_USER</code> y <code>SOFTGUARD_API_PASS</code> en{" "}
            <code>.env.local</code> y reiniciar.
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

      <SoftGuardModulosPanel />

      <section aria-labelledby="sg-info-heading" className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-3">
        <h2 id="sg-info-heading" className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Configuración (.env.local)
        </h2>
        <dl className="grid grid-cols-[auto_auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {[
            ["SOFTGUARD_API_BASE", "URL de la suite web (http://<host>:8080)", false],
            ["SOFTGUARD_API_USER", "Usuario de la suite (con línea y módulos asignados)", false],
            ["SOFTGUARD_API_PASS", "Clave del usuario", false],
            ["SOFTGUARD_API_CLIENT_ID", "GUID del cliente OAuth (campo oculto del login)", true],
            ["SOFTGUARD_API_TIMEOUT_MS", "Timeout por request (default 15000)", true],
          ].map(([key, desc, opcional]) => {
            const seteada = Boolean(process.env[key as string]);
            return (
              <div key={key as string} className="contents">
                <dt>
                  <code className="text-xs bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">
                    {key}
                  </code>
                </dt>
                <dd>
                  {seteada ? (
                    <span className="text-xs font-semibold text-emerald-400">✓ Configurada</span>
                  ) : opcional ? (
                    <span className="text-xs text-slate-500">— Opcional</span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-400">✗ Falta</span>
                  )}
                </dd>
                <dd className="text-slate-400">{desc as string}</dd>
              </div>
            );
          })}
        </dl>
        <p className="text-xs text-slate-500 pt-1">
          Ver{" "}
          <code className="text-slate-400">docs/integracion-softguard.md</code>{" "}
          §&quot;Camino activo&quot; para la arquitectura del ACL y la receta para
          integrar módulos nuevos de la suite.
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

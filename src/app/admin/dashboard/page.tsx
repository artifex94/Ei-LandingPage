import { prisma } from "@/lib/prisma/client";

export default async function AdminDashboardPage() {
  const [totalCuentas, suspendidas, enMantenimiento, solicitudesPendientes] =
    await Promise.all([
      prisma.cuenta.count({ where: { estado: "ACTIVA" } }),
      prisma.cuenta.count({ where: { estado: "SUSPENDIDA_PAGO" } }),
      prisma.cuenta.count({ where: { estado: "EN_MANTENIMIENTO" } }),
      prisma.solicitudMantenimiento.count({ where: { estado: { not: "RESUELTA" } } }),
    ]);

  const anio = new Date().getFullYear();
  const mes = new Date().getMonth() + 1;

  const [pagosEstesMes, pagosPendientesEsteMes] = await Promise.all([
    prisma.pago.count({ where: { anio, mes, estado: "PAGADO" } }),
    prisma.pago.count({ where: { anio, mes, estado: { in: ["PENDIENTE", "VENCIDO"] } } }),
  ]);

  const tarjetas = [
    { label: "Cuentas activas", valor: totalCuentas, color: "text-green-400 bg-green-900/30 border-green-800" },
    { label: "Suspendidas por pago", valor: suspendidas, color: "text-red-400 bg-red-900/30 border-red-800" },
    { label: "En mantenimiento", valor: enMantenimiento, color: "text-yellow-400 bg-yellow-900/30 border-yellow-800" },
    { label: "Solicitudes abiertas", valor: solicitudesPendientes, color: "text-blue-400 bg-blue-900/30 border-blue-800" },
    { label: `Pagos cobrados (${mes}/${anio})`, valor: pagosEstesMes, color: "text-green-400 bg-green-900/30 border-green-800" },
    { label: `Pagos pendientes (${mes}/${anio})`, valor: pagosPendientesEsteMes, color: "text-amber-400 bg-amber-900/30 border-amber-800" },
  ];

  return (
    <section aria-labelledby="admin-heading">
      <h1 id="admin-heading" className="text-2xl font-bold text-white mb-8">
        Dashboard
      </h1>

      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4" role="list">
        {tarjetas.map((t) => (
          <li key={t.label} className={`rounded-xl border p-5 ${t.color}`}>
            <p className="text-3xl font-bold">{t.valor}</p>
            <p className="text-sm font-medium mt-1 opacity-80">{t.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

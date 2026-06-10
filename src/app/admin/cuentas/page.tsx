import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { ShieldCheck } from "lucide-react";
import type { EstadoCuenta } from "@/generated/prisma/client";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

const TUTORIAL_CUENTAS = [
  {
    titulo: "Cuenta vs Cliente",
    descripcion: "Un cliente (titular) puede tener múltiples cuentas (inmuebles vigilados). Desde acá ves todas las cuentas sin importar el titular.",
  },
  {
    titulo: "Filtrar por estado",
    descripcion: "Usá los botones de estado arriba para ver solo Activas, Suspendidas, En mantenimiento o Baja definitiva.",
  },
  {
    titulo: "Detalle de cuenta",
    descripcion: "Desde el detalle podés ver sensores, pagos históricos, solicitudes y cambiar el estado o la tarifa de la cuenta.",
  },
  {
    titulo: "Suspender o dar de baja",
    descripcion: "El cambio de estado se hace desde el detalle de la cuenta. Suspendida = sin servicio por mora. Baja = cancelación permanente.",
  },
];

export const metadata: Metadata = { title: "Cuentas" };

const ESTADO_COLORES: Record<string, string> = {
  ACTIVA:           "bg-green-900/40 text-green-400",
  SUSPENDIDA_PAGO:  "bg-red-900/40 text-red-400",
  EN_MANTENIMIENTO: "bg-yellow-900/40 text-yellow-400",
  BAJA_DEFINITIVA:  "bg-slate-700 text-slate-300",
};

const ESTADO_LABELS: Record<string, string> = {
  ACTIVA:           "Activa",
  SUSPENDIDA_PAGO:  "Suspendida",
  EN_MANTENIMIENTO: "Mantenimiento",
  BAJA_DEFINITIVA:  "Baja",
};

const CATEGORIA_LABELS: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma",
  DOMOTICA:         "Domótica",
  CAMARA_CCTV:      "CCTV",
  ANTENA_STARLINK:  "StarLink",
  OTRO:             "Otro",
};

const POR_PAGINA = 40;

export default async function CuentasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  const { estado, q, pagina: paginaStr } = await searchParams;
  const pagina = Math.max(1, Number(paginaStr ?? 1));

  const where = {
    ...(estado ? { estado: estado as unknown as EstadoCuenta } : {}),
    ...(q
      ? {
          OR: [
            { descripcion: { contains: q, mode: "insensitive" as const } },
            { softguard_ref: { contains: q } },
            { perfil: { nombre: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, cuentas] = await Promise.all([
    prisma.cuenta.count({ where }),
    prisma.cuenta.findMany({
      where,
      include: {
        perfil: { select: { nombre: true } },
        _count: { select: { sensores: true } },
      },
      orderBy: { descripcion: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const estados = ["ACTIVA", "SUSPENDIDA_PAGO", "EN_MANTENIMIENTO", "BAJA_DEFINITIVA"];

  type CuentaRow = (typeof cuentas)[number];

  const columns: Column<CuentaRow>[] = [
    {
      id: "descripcion",
      header: "Descripción",
      cell: (c) => (
        <span className="block font-medium text-white max-w-[200px] truncate">{c.descripcion}</span>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      cell: (c) => <span className="text-slate-300">{c.perfil.nombre}</span>,
    },
    {
      id: "categoria",
      header: "Categoría",
      cell: (c) => <span className="text-slate-300">{CATEGORIA_LABELS[c.categoria] ?? c.categoria}</span>,
    },
    {
      id: "estado",
      header: "Estado",
      cell: (c) => (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLORES[c.estado] ?? "bg-slate-700 text-slate-400"}`}>
          {ESTADO_LABELS[c.estado] ?? c.estado}
        </span>
      ),
    },
    {
      id: "tarifa",
      header: "Tarifa",
      cell: (c) => <span className="text-slate-300">${Number(c.costo_mensual).toLocaleString("es-AR")}</span>,
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      cell: (c) => (
        <Link
          href={`/admin/cuentas/${c.id}`}
          aria-label={`Ver cuenta ${c.descripcion}`}
          className="text-orange-400 hover:text-orange-300 hover:underline min-h-[44px] flex items-center transition-colors"
        >
          Ver
        </Link>
      ),
    },
  ];

  const renderCard = (c: CuentaRow) => (
    <Link
      href={`/admin/cuentas/${c.id}`}
      className="block bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 hover:border-orange-500/50 active:bg-slate-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{c.descripcion}</p>
          <p className="text-sm text-slate-400 mt-0.5">{c.perfil.nombre}</p>
          <p className="text-xs text-slate-400 mt-0.5">{CATEGORIA_LABELS[c.categoria] ?? c.categoria}</p>
        </div>
        <div className="shrink-0 text-right space-y-1.5">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full block ${ESTADO_COLORES[c.estado] ?? "bg-slate-700 text-slate-400"}`}>
            {ESTADO_LABELS[c.estado] ?? c.estado}
          </span>
          <p className="text-white text-sm font-semibold">
            ${Number(c.costo_mensual).toLocaleString("es-AR")}
          </p>
          <span className="text-orange-400 text-xs" aria-hidden="true">Ver →</span>
        </div>
      </div>
    </Link>
  );

  const hrefPagina = (n: number) =>
    `/admin/cuentas?pagina=${n}${estado ? `&estado=${encodeURIComponent(estado)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <section aria-labelledby="cuentas-heading">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 id="cuentas-heading" className="text-2xl font-bold text-white">
          Cuentas ({total})
        </h1>
        <a
          href="/api/admin/export?tipo=cuentas"
          aria-label="Exportar cuentas a Excel"
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-3 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors shrink-0"
        >
          ↓ Excel
        </a>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <label htmlFor="cuentas-busqueda" className="sr-only">Buscar cuenta</label>
        <input
          id="cuentas-busqueda"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar..."
          aria-label="Buscar cuenta"
          className="flex-1 min-w-[160px] bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        />
        <label htmlFor="cuentas-estado" className="sr-only">Filtrar por estado</label>
        <select
          id="cuentas-estado"
          name="estado"
          defaultValue={estado ?? ""}
          aria-label="Filtrar por estado"
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-2 focus:outline-orange-500"
        >
          <option value="">Todos</option>
          {estados.map((e) => (
            <option key={e} value={e}>{ESTADO_LABELS[e] ?? e}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors"
        >
          Filtrar
        </button>
      </form>

      <DataTable
        columns={columns}
        rows={cuentas}
        keyExtractor={(c) => c.id}
        caption="Listado de cuentas"
        renderCard={renderCard}
        emptyState={<EmptyState icon={ShieldCheck} title="No se encontraron cuentas." />}
      />

      {totalPaginas > 1 && (
        <div className="pt-4 mt-4 border-t border-slate-700">
          <Pagination page={pagina} pageCount={totalPaginas} makeHref={hrefPagina} />
        </div>
      )}

      <TutorialContextual
        section="cuentas"
        titulo="Guía rápida — Cuentas"
        steps={TUTORIAL_CUENTAS}
      />
    </section>
  );
}

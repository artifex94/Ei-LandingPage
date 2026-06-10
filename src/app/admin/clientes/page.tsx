import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

const TUTORIAL_CLIENTES = [
  {
    titulo: "Buscar un cliente",
    descripcion: "Usá el campo de búsqueda para encontrar por nombre, DNI o teléfono. Los resultados aparecen al instante.",
  },
  {
    titulo: "Ver detalle y cuentas",
    descripcion: 'Hacé clic en "Ver" para abrir el perfil del cliente. Desde ahí podés ver sus cuentas, pagos y solicitudes.',
  },
  {
    titulo: "Dar de alta un cliente nuevo",
    descripcion: 'El botón "+ Nuevo" abre el formulario de alta. Completá datos personales y vinculá o creá una cuenta.',
  },
];

export const metadata: Metadata = { title: "Clientes" };

const POR_PAGINA = 30;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q, pagina: paginaStr } = await searchParams;
  const pagina = Math.max(1, Number(paginaStr ?? 1));

  const whereBase = { rol: "CLIENTE" as const };
  const where = q
    ? {
        AND: [
          whereBase,
          {
            OR: [
              { nombre: { contains: q, mode: "insensitive" as const } },
              { dni: { contains: q } },
              { telefono: { contains: q } },
            ],
          },
        ],
      }
    : whereBase;

  const [total, perfiles] = await Promise.all([
    prisma.perfil.count({ where }),
    prisma.perfil.findMany({
      where,
      include: { cuentas: { select: { id: true } } },
      orderBy: { nombre: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  type ClienteRow = (typeof perfiles)[number];

  const columns: Column<ClienteRow>[] = [
    {
      id: "nombre",
      header: "Nombre",
      cell: (p) => <span className="font-medium text-white">{p.nombre}</span>,
    },
    {
      id: "dni",
      header: "DNI",
      cell: (p) => <span className="text-slate-300 font-mono">{p.dni ?? "—"}</span>,
    },
    {
      id: "telefono",
      header: "Teléfono",
      cell: (p) => <span className="text-slate-300">{p.telefono ?? "—"}</span>,
    },
    {
      id: "cuentas",
      header: "Cuentas",
      cell: (p) => <span className="text-slate-300">{p.cuentas.length}</span>,
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      cell: (p) => (
        <Link
          href={`/admin/clientes/${p.id}`}
          className="text-orange-400 hover:text-orange-300 hover:underline min-h-[44px] flex items-center transition-colors"
        >
          Ver
        </Link>
      ),
    },
  ];

  const renderCard = (p: ClienteRow) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{p.nombre}</p>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{p.dni ?? "—"}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {p.telefono && (
            <a
              href={`https://wa.me/549${p.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${p.nombre.split(" ")[0]}, te contactamos de Escobar Instalaciones.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp a ${p.nombre}`}
              className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2.5 rounded-lg transition-colors min-h-[44px] flex items-center"
            >
              WA
            </a>
          )}
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-2 rounded-lg font-medium">
            {p.cuentas.length}c
          </span>
          <Link
            href={`/admin/clientes/${p.id}`}
            aria-label={`Ver perfil de ${p.nombre}`}
            className="text-orange-400 hover:text-orange-300 text-xs font-semibold px-3 py-2.5 rounded-lg border border-orange-500/30 transition-colors min-h-[44px] flex items-center"
          >
            Ver →
          </Link>
        </div>
      </div>
    </div>
  );

  const hrefPagina = (n: number) =>
    `/admin/clientes?pagina=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <section aria-labelledby="clientes-heading">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 id="clientes-heading" className="text-2xl font-bold text-white">
          Clientes ({total})
        </h1>
        <div className="flex gap-2 shrink-0">
          <a
            href="/api/admin/export?tipo=clientes"
            aria-label="Exportar clientes a Excel"
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-3 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors"
          >
            ↓ Excel
          </a>
          <Link
            href="/admin/clientes/nuevo"
            className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-semibold px-4 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors"
          >
            + Nuevo
          </Link>
        </div>
      </div>

      <form method="GET" className="mb-6">
        <label htmlFor="busqueda" className="sr-only">Buscar cliente</label>
        <input
          id="busqueda"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre, DNI o teléfono..."
          className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-4 py-2 text-sm focus:outline-2 focus:outline-orange-500 min-h-[44px]"
        />
      </form>

      <DataTable
        columns={columns}
        rows={perfiles}
        keyExtractor={(p) => p.id}
        caption="Listado de clientes"
        renderCard={renderCard}
        emptyState={
          <EmptyState
            icon={Users}
            title="No se encontraron clientes."
            action={q ? undefined : { label: "Registrar primer cliente", href: "/admin/clientes/nuevo" }}
          />
        }
      />

      <TutorialContextual
        section="clientes"
        titulo="Guía rápida — Clientes"
        steps={TUTORIAL_CLIENTES}
      />

      {totalPaginas > 1 && (
        <div className="pt-4 mt-4 border-t border-slate-700">
          <Pagination page={pagina} pageCount={totalPaginas} makeHref={hrefPagina} />
        </div>
      )}
    </section>
  );
}

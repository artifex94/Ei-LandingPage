import type { Metadata } from "next";
import Link from "next/link";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { METODO_LABEL } from "@/lib/constants/payment";
import { DataTable, type Column } from "@/components/ui/DataTable";

export const metadata: Metadata = { title: "Documentos" };

const MESES_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

// ── Tipos para searchParams ───────────────────────────────────────────────────

type Tab = "recibos" | "facturas";

// ── Página ────────────────────────────────────────────────────────────────────

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; anio?: string }>;
}) {
  const { userId } = await requireSesion();
  const sp  = await searchParams;
  const tab: Tab = sp.tab === "facturas" ? "facturas" : "recibos";
  const anioActual = new Date().getFullYear();

  // ── Años disponibles por tipo (para los chips de año) ──────────────────────
  const [aniosRecibosRaw, aniosFacturasRaw] = await Promise.all([
    prisma.pago.findMany({
      where: { estado: "PAGADO", cuenta: { perfil_id: userId } },
      select: { anio: true },
      distinct: ["anio"],
      orderBy: { anio: "desc" },
    }),
    prisma.factura.findMany({
      where: {
        perfil_id: userId,
        estado: { in: ["EMITIDA_MANUAL", "EMITIDA_WSFE"] },
      },
      select: { periodo_desde: true },
      orderBy: { periodo_desde: "desc" },
    }),
  ]);

  const aniosRecibos  = aniosRecibosRaw.map((r) => r.anio);
  const aniosFacturas = [
    ...new Set(aniosFacturasRaw.map((f) => new Date(f.periodo_desde).getFullYear())),
  ].sort((a, b) => b - a);

  const aniosDelTab   = tab === "recibos" ? aniosRecibos : aniosFacturas;
  const anioDefault   = aniosDelTab[0] ?? anioActual;
  const anioParam     = Number(sp.anio);
  const anio          = aniosDelTab.includes(anioParam) ? anioParam : anioDefault;

  // ── Datos del tab activo, filtrados por año ────────────────────────────────
  const pagos =
    tab === "recibos"
      ? await prisma.pago.findMany({
          where: {
            estado: "PAGADO",
            anio,
            cuenta: { perfil_id: userId },
          },
          include: { cuenta: { select: { descripcion: true } } },
          orderBy: { mes: "desc" },
        })
      : [];

  const facturas =
    tab === "facturas"
      ? await prisma.factura.findMany({
          where: {
            perfil_id: userId,
            estado: { in: ["EMITIDA_MANUAL", "EMITIDA_WSFE"] },
            periodo_desde: {
              gte: new Date(anio, 0, 1),
              lt:  new Date(anio + 1, 0, 1),
            },
          },
          orderBy: { periodo_desde: "desc" },
        })
      : [];

  // ── Helpers de URL ────────────────────────────────────────────────────────
  function tabHref(t: Tab)   { return `/portal/documentos?tab=${t}`; }
  function anioHref(a: number) { return `/portal/documentos?tab=${tab}&anio=${a}`; }

  type ReciboRow = (typeof pagos)[number];
  type FacturaRow = (typeof facturas)[number];

  const recibosColumns: Column<ReciboRow>[] = [
    {
      id: "mes",
      header: "Mes",
      cell: (p) => <span className="text-white capitalize">{MESES_ES[p.mes - 1]}</span>,
    },
    {
      id: "servicio",
      header: "Servicio",
      className: "hidden sm:table-cell",
      cell: (p) => <span className="text-slate-400 text-xs">{p.cuenta.descripcion}</span>,
    },
    {
      id: "importe",
      header: "Importe",
      align: "right",
      cell: (p) => (
        <span className="font-semibold text-white">
          ${Number(p.importe).toLocaleString("es-AR")}
          {p.metodo && (
            <span className="block text-xs font-normal text-slate-500">
              {METODO_LABEL[p.metodo] ?? p.metodo}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      className: "w-16",
      cell: (p) => (
        <Link
          href={`/recibo/${p.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          aria-label={`Ver recibo de ${MESES_ES[p.mes - 1]} ${anio}`}
        >
          Ver ↗
        </Link>
      ),
    },
  ];

  const facturasColumns: Column<FacturaRow>[] = [
    {
      id: "mes",
      header: "Mes",
      cell: (f) => (
        <span className="text-white capitalize">
          {new Date(f.periodo_desde).toLocaleDateString("es-AR", { month: "long" })}
        </span>
      ),
    },
    {
      id: "numero",
      header: "Nº",
      className: "hidden sm:table-cell",
      cell: (f) => <span className="font-mono text-xs text-slate-400">{f.numero_oficial ?? "—"}</span>,
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (f) => <span className="font-semibold text-white">${Number(f.total).toLocaleString("es-AR")}</span>,
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      align: "right",
      className: "w-16",
      cell: (f) =>
        f.pdf_url ? (
          <a
            href={f.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
            aria-label={`Descargar factura de ${new Date(f.periodo_desde).toLocaleDateString("es-AR", { month: "long" })} ${anio}`}
          >
            PDF ↗
          </a>
        ) : (
          <span className="text-xs text-slate-500">Próximamente</span>
        ),
    },
  ];

  return (
    <section className="space-y-6" aria-labelledby="docs-heading">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div>
        <h1 id="docs-heading" className="text-2xl font-bold text-white">
          Documentos
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Tus comprobantes de pago y facturas emitidas.
        </p>
      </div>

      {/* ── Tabs Recibos / Facturas ─────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Tipo de documento"
        className="flex gap-1 p-1 bg-slate-800 rounded-xl w-full sm:w-fit"
      >
        <TabButton
          href={tabHref("recibos")}
          active={tab === "recibos"}
          activeClass="bg-amber-500/20 text-amber-300"
          inactiveClass="text-slate-400 hover:text-slate-200"
        >
          Recibos
        </TabButton>
        <TabButton
          href={tabHref("facturas")}
          active={tab === "facturas"}
          activeClass="bg-teal-500/20 text-teal-300"
          inactiveClass="text-slate-400 hover:text-slate-200"
        >
          Facturas AFIP
        </TabButton>
      </div>

      {/* ── Chips de año ────────────────────────────────────────────────────── */}
      {aniosDelTab.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          aria-label="Filtrar por año"
        >
          {aniosDelTab.map((a) => (
            <Link
              key={a}
              href={anioHref(a)}
              className={`
                shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${a === anio
                  ? tab === "recibos"
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                    : "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40"
                  : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700"
                }
              `}
              aria-current={a === anio ? "true" : undefined}
            >
              {a}
            </Link>
          ))}
        </div>
      )}

      {/* ── Tabla de recibos ────────────────────────────────────────────────── */}
      {tab === "recibos" && (
        <>
          <DataTable
            columns={recibosColumns}
            rows={pagos}
            keyExtractor={(p) => p.id}
            caption={`Recibos de ${anio}`}
            emptyState={
              <EmptyState
                mensaje={
                  aniosRecibos.length === 0
                    ? "Aún no tenés pagos registrados."
                    : `No hay recibos para ${anio}.`
                }
                sugerencia={aniosRecibos.length > 1 ? "Probá seleccionando otro año arriba." : undefined}
              />
            }
          />
        </>
      )}

      {/* ── Tabla de facturas ───────────────────────────────────────────────── */}
      {tab === "facturas" && (
        <>
          <DataTable
            columns={facturasColumns}
            rows={facturas}
            keyExtractor={(f) => f.id}
            caption={`Facturas de ${anio}`}
            emptyState={
              <EmptyState
                mensaje={
                  aniosFacturas.length === 0
                    ? "Aún no hay facturas emitidas para tu cuenta."
                    : `No hay facturas para ${anio}.`
                }
                sugerencia={aniosFacturas.length > 1 ? "Probá seleccionando otro año arriba." : undefined}
              />
            }
          />
        </>
      )}

    </section>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function TabButton({
  href,
  active,
  activeClass,
  inactiveClass,
  children,
}: {
  href: string;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`
        flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium
        text-center transition-colors min-h-[44px] flex items-center justify-center
        ${active ? activeClass : inactiveClass}
      `}
    >
      {children}
    </Link>
  );
}

function EmptyState({
  mensaje,
  sugerencia,
}: {
  mensaje: string;
  sugerencia?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-10 text-center space-y-1">
      <p className="text-slate-400">{mensaje}</p>
      {sugerencia && <p className="text-slate-500 text-sm">{sugerencia}</p>}
    </div>
  );
}

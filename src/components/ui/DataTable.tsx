import React from "react";
import { cn } from "@/lib/ui/cn";

export type ColumnAlign = "left" | "center" | "right";

export interface Column<T> {
  /** Identificador estable de la columna. */
  id: string;
  /** Encabezado visible (o usado como aria-label si `srOnlyHeader`). */
  header: React.ReactNode;
  /** Render de la celda para una fila. */
  cell: (row: T) => React.ReactNode;
  align?: ColumnAlign;
  /** Clases extra para `td`/`th` de esta columna. */
  className?: string;
  /** Oculta visualmente el header (queda accesible para lectores). */
  srOnlyHeader?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  /** Descripción accesible de la tabla (sr-only). */
  caption: string;
  /** Render cuando `rows` está vacío (ej. <EmptyState/>). */
  emptyState?: React.ReactNode;
  /** Esqueleto de carga (filas). */
  isLoading?: boolean;
  /** Filas a simular en estado de carga. */
  loadingRows?: number;
  /** Click de fila (toda la fila se vuelve interactiva). */
  onRowClick?: (row: T) => void;
  /**
   * Clases para el `<tr>` por fila. Si se provee, REEMPLAZA el fondo/hover por
   * defecto (útil para resaltar filas, ej. vencidas en rojo).
   */
  rowClassName?: (row: T) => string;
  /**
   * Render alternativo en tarjeta para viewport `< md`. Si se provee, la tabla
   * queda `hidden md:block` y en mobile se muestran las tarjetas (RF-A5, modo
   * stack). Si se omite, la tabla hace scroll horizontal en mobile.
   */
  renderCard?: (row: T) => React.ReactNode;
}

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Tabla de datos genérica y tipada. Consolida las 23 `<table>` crudas del
 * proyecto en una sola primitiva accesible (RF-A5): `caption` sr-only,
 * `scope="col"`, `divide-y`, estados vacío y de carga.
 */
export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  caption,
  emptyState,
  isLoading = false,
  loadingRows = 5,
  onRowClick,
  rowClassName,
  renderCard,
}: DataTableProps<T>) {
  if (!isLoading && rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const table = (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-slate-400 font-medium",
                    ALIGN_CLASS[col.align ?? "left"],
                    col.className,
                  )}
                >
                  {col.srOnlyHeader ? (
                    <span className="sr-only">{col.header}</span>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {isLoading
              ? Array.from({ length: loadingRows }).map((_, r) => (
                  <tr key={`skeleton-${r}`} className="bg-slate-900">
                    {columns.map((col) => (
                      <td key={col.id} className="px-4 py-3">
                        <div className="h-4 rounded bg-slate-700/60 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      rowClassName ? rowClassName(row) : "bg-slate-900 hover:bg-slate-800/50",
                      "transition-colors",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-4 py-3",
                          ALIGN_CLASS[col.align ?? "left"],
                          col.className,
                        )}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!renderCard) return table;

  return (
    <>
      <div className="hidden md:block">{table}</div>
      <div className="md:hidden space-y-3">
        {isLoading
          ? Array.from({ length: loadingRows }).map((_, r) => (
              <div
                key={`card-skeleton-${r}`}
                className="h-20 rounded-xl border border-slate-700 bg-slate-800/50 animate-pulse"
              />
            ))
          : rows.map((row) => (
              <div key={keyExtractor(row)}>{renderCard(row)}</div>
            ))}
      </div>
    </>
  );
}

export default DataTable;

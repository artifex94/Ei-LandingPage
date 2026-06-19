import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/ui/cn";

export interface PaginationProps {
  /** Página actual (1-based). */
  page: number;
  /** Cantidad total de páginas. */
  pageCount: number;
  /** Construye el href de una página dada (server-friendly, vía searchParams). */
  makeHref: (page: number) => string;
  className?: string;
}

const itemClass =
  "inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 rounded-md text-sm transition-colors";

/**
 * Paginación controlada por URL (searchParams), compatible con Server
 * Components. A11y: `nav[aria-label]`, `aria-current`, targets 44px (RF-A7).
 */
export function Pagination({ page, pageCount, makeHref, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-between gap-2", className)}
    >
      {prevDisabled ? (
        <span className={cn(itemClass, "text-slate-600 cursor-not-allowed")} aria-disabled="true">
          <ChevronLeft className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline">Anterior</span>
        </span>
      ) : (
        <Link href={makeHref(page - 1)} className={cn(itemClass, "text-slate-300 hover:bg-slate-800")}>
          <ChevronLeft className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline">Anterior</span>
        </Link>
      )}

      <span className="text-xs text-slate-400 tabular-nums" aria-current="page">
        Página {page} de {pageCount}
      </span>

      {nextDisabled ? (
        <span className={cn(itemClass, "text-slate-600 cursor-not-allowed")} aria-disabled="true">
          <span className="mr-1 hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      ) : (
        <Link href={makeHref(page + 1)} className={cn(itemClass, "text-slate-300 hover:bg-slate-800")}>
          <span className="mr-1 hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </nav>
  );
}

export default Pagination;

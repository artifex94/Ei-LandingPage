import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/ui/cn";

interface BrandLockupProps {
  context?: string;
  compact?: boolean;
  className?: string;
}

/** Identidad compartida por las superficies públicas y autenticadas. */
export function BrandLockup({ context, compact = false, className }: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-tactical-500 text-slate-950 shadow-[0_8px_24px_rgba(241,119,32,0.18)]",
          compact ? "h-8 w-8" : "h-11 w-11",
        )}
      >
        <ShieldCheck className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.3} />
      </span>
      <span className="min-w-0">
        <span className={cn("block font-display font-bold leading-none text-white", compact ? "text-sm" : "text-base")}>
          Escobar Instalaciones
        </span>
        {context && (
          <span className="mt-1 block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {context}
          </span>
        )}
      </span>
    </div>
  );
}

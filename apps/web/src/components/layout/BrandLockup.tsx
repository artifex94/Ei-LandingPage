import Image from "next/image";
import { cn } from "@/lib/ui/cn";

interface BrandLockupProps {
  context?: string;
  compact?: boolean;
  className?: string;
}

/** Identidad compartida por las superficies públicas y autenticadas. */
export function BrandLockup({ context, compact = false, className }: BrandLockupProps) {
  const size = compact ? 32 : 44;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          compact ? "h-8 w-8" : "h-11 w-11",
        )}
      >
        <Image
          src="/logo.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="44px"
          className="logo-glow pointer-events-none select-none object-contain"
        />
        <Image
          src="/logo.png"
          alt="Escobar Instalaciones"
          width={size}
          height={size}
          className={cn("relative object-contain", compact ? "h-8 w-8" : "h-11 w-11")}
        />
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

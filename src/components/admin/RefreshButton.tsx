"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      title="Actualizar datos"
      aria-label="Actualizar datos"
      className="absolute top-0 right-4 lg:right-8 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
    >
      <RefreshCw
        className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
      />
      <span className="hidden sm:inline">Actualizar</span>
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { terminarImpersonacion } from "@/lib/actions/impersonacion";

interface Props {
  variant?: "sidebar" | "nav";
  /**
   * true cuando un ADMIN está impersonando a un cliente y este botón vive
   * dentro del portal. En ese caso NO puede cerrar la sesión real del admin
   * (dejaría la cookie `ei_impersonar` viva hasta por 45 min — re-login
   * dentro de esa ventana reingresaría en silencio a la identidad del
   * cliente). En su lugar, termina la impersonación y vuelve al admin.
   */
  impersonando?: boolean;
  /** Solo ícono (para el sidebar colapsado del admin). */
  compact?: boolean;
}

export function LogoutButton({ variant = "nav", impersonando = false, compact = false }: Props) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (impersonando) {
    const className =
      variant === "sidebar"
        ? "w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-700 hover:text-white min-h-[44px] flex items-center gap-2 transition-colors"
        : "text-slate-400 hover:text-white text-sm min-h-[44px] flex items-center transition-colors";

    return (
      <form action={terminarImpersonacion}>
        <button type="submit" className={className}>
          {variant === "sidebar" && <span aria-hidden="true">→</span>} Salir de la vista
        </button>
      </form>
    );
  }

  if (variant === "sidebar") {
    if (compact) {
      return (
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="mx-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <span aria-hidden="true">→</span>
        </button>
      );
    }
    return (
      <button
        onClick={handleLogout}
        className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-700 hover:text-white min-h-[44px] flex items-center gap-2 transition-colors"
      >
        <span aria-hidden="true">→</span> Cerrar sesión
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="text-slate-400 hover:text-white text-sm min-h-[44px] flex items-center transition-colors"
    >
      Salir
    </button>
  );
}

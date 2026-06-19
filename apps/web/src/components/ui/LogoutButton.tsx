"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  variant?: "sidebar" | "nav";
}

export function LogoutButton({ variant = "nav" }: Props) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (variant === "sidebar") {
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

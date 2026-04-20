"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  deudaTotal: number;
}

export function PagoRequeridoModal({ deudaTotal }: Props) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-red-800 rounded-2xl p-6 shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-describedby="paywall-desc"
        >
          {/* Ícono */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-900/50 border border-red-700 flex items-center justify-center text-2xl" aria-hidden="true">
              ⚠
            </div>
          </div>

          <Dialog.Title className="text-xl font-bold text-white text-center mb-2">
            Servicio suspendido por falta de pago
          </Dialog.Title>

          <p id="paywall-desc" className="text-slate-300 text-center text-sm mb-4">
            Para reactivar tu servicio de monitoreo regularizá el pago de los
            períodos adeudados. El proceso es inmediato.
          </p>

          {deudaTotal > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 mb-5 text-center">
              <p className="text-slate-400 text-xs mb-0.5">Total a regularizar</p>
              <p className="text-white font-bold text-2xl">
                ${deudaTotal.toLocaleString("es-AR")}
              </p>
            </div>
          )}

          {/* Acción principal */}
          <Link
            href="/portal/pagos"
            className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl min-h-[48px] transition-colors text-base flex items-center justify-center gap-2"
          >
            <span aria-hidden="true">💳</span>
            Ver mis pagos y regularizar
          </Link>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* Contacto WhatsApp */}
            <a
              href="https://wa.me/5493436575372?text=Hola%2C+quiero+regularizar+mi+servicio+suspendido"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-green-800/50 hover:bg-green-700/60 border border-green-700 text-green-300 font-semibold py-2.5 px-3 rounded-xl min-h-[44px] transition-colors text-sm"
            >
              <span aria-hidden="true">📱</span>
              WhatsApp
            </a>

            {/* Cerrar sesión */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-semibold py-2.5 px-3 rounded-xl min-h-[44px] transition-colors text-sm"
            >
              <span aria-hidden="true">↩</span>
              Cerrar sesión
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            ¿Ya pagaste? Tu servicio se reactiva automáticamente al confirmarse.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

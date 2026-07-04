"use client";

import Link from "next/link";
import { AlertTriangle, CreditCard, MessageCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { siteConfig } from "@/config/site";

interface Props {
  deudaTotal: number;
  /**
   * true cuando un ADMIN está impersonando a este cliente. El paywall se
   * sigue mostrando (el admin ve exactamente lo que ve el cliente), pero NO
   * puede cerrar la sesión REAL del admin desde acá — eso dejaría la cookie
   * `ei_impersonar` viva hasta por 45 min (re-login dentro de esa ventana
   * reingresaría en silencio a la identidad del cliente). El
   * `ImpersonacionBanner` (z-60, por encima de este modal z-50) ya expone
   * "Salir de la vista" de forma permanente, así que acá solo lo señalamos.
   */
  impersonando?: boolean;
}

export function PagoRequeridoModal({ deudaTotal, impersonando = false }: Props) {
  const router = useRouter();

  async function handleLogout() {
    // Import dinámico: el SDK de Supabase (~220 kB) solo se descarga al
    // hacer click en "Cerrar sesión", no en el first-load de cada página.
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <Modal
      open
      dismissible={false}
      titleHidden
      size="md"
      title="Servicio suspendido por falta de pago"
      className="border-red-800"
    >
      {/* Ícono */}
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-red-900/50 border border-red-700 flex items-center justify-center" aria-hidden="true">
          <AlertTriangle className="w-7 h-7 text-red-400" strokeWidth={1.8} />
        </div>
      </div>

      <p aria-hidden="true" className="text-xl font-display font-bold text-white text-center mb-2">
        Servicio suspendido por falta de pago
      </p>

      <p className="text-slate-300 text-center text-sm mb-4">
        Para reactivar tu servicio de monitoreo regularizá el pago de los
        períodos adeudados. El proceso es inmediato.
      </p>

      {deudaTotal > 0 && (
        <div className="bg-slate-700/50 rounded-xl border border-slate-600 p-3 mb-5 text-center">
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
        <CreditCard aria-hidden="true" className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
        Ver mis pagos y regularizar
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* Contacto WhatsApp */}
        <a
          href={`${siteConfig.contact.whatsappLink}?text=Hola%2C+quiero+regularizar+mi+servicio+suspendido`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-green-800/50 hover:bg-green-700/60 border border-green-700 text-green-300 font-semibold py-2.5 px-3 rounded-xl min-h-[44px] transition-colors text-sm"
        >
          <MessageCircle aria-hidden="true" className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
          WhatsApp
        </a>

        {/* Cerrar sesión — oculto durante impersonación, ver nota en Props */}
        {impersonando ? (
          <p className="flex items-center justify-center text-center text-xs text-slate-500 px-2">
            Usá &quot;Salir de la vista&quot; en el banner superior
          </p>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 font-semibold py-2.5 px-3 rounded-xl min-h-[44px] transition-colors text-sm"
          >
            <LogOut aria-hidden="true" className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
            Cerrar sesión
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center mt-4">
        ¿Ya pagaste? Tu servicio se reactiva automáticamente al confirmarse.
      </p>
    </Modal>
  );
}

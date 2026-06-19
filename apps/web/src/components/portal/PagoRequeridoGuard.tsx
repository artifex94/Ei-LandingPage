"use client";

import { usePathname } from "next/navigation";
import { PagoRequeridoModal } from "./PagoRequeridoModal";

/**
 * Guard que decide si mostrar el hard paywall modal.
 *
 * El modal NO aparece en /portal/pagos para que el usuario
 * pueda ver y abonar su deuda sin ser bloqueado.
 */
const RUTAS_PERMITIDAS_SUSPENDIDO = ["/portal/pagos"];

export function PagoRequeridoGuard({ deudaTotal }: { deudaTotal: number }) {
  const pathname = usePathname();

  // En la página de pagos el usuario está haciendo exactamente lo que necesita:
  // pagar. No lo bloqueamos allí.
  if (RUTAS_PERMITIDAS_SUSPENDIDO.some((r) => pathname.startsWith(r))) {
    return null;
  }

  return <PagoRequeridoModal deudaTotal={deudaTotal} />;
}

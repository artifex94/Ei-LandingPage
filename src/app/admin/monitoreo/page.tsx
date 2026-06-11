import type { Metadata } from "next";
import { MonitorOperadores } from "@/components/admin/MonitorOperadores";

export const metadata: Metadata = {
  title: "Monitoreo en vivo",
};

export default function MonitoreoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">
          Monitoreo en vivo
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          La grilla de la central en tiempo real, cruzada con los datos del portal.
          Solo lectura: los eventos se procesan en la suite de SoftGuard.
        </p>
      </div>

      <MonitorOperadores />
    </div>
  );
}

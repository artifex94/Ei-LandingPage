import type { Metadata } from "next";
import { CsvUploader } from "@/components/admin/CsvUploader";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

export const metadata: Metadata = { title: "Importar" };

const TUTORIAL_IMPORTAR = [
  {
    titulo: "Dónde descargar el CSV",
    descripcion: "En SoftGuard andá a Reportes → Exportar clientes. Guardá el archivo y subilo acá tal cual.",
  },
  {
    titulo: "Qué hace la importación",
    descripcion: "Crea o actualiza cuentas y perfiles de clientes. Si una cuenta ya existe (por código SoftGuard), la actualiza sin duplicar.",
  },
  {
    titulo: "Si hay errores en el CSV",
    descripcion: "El sistema muestra fila por fila qué falló. Podés corregir el CSV y reimportar solo las filas con problema.",
  },
  {
    titulo: "Después de importar",
    descripcion: "Revisá en Clientes y Cuentas que los datos quedaron bien. La importación no toca pagos ni solicitudes existentes.",
  },
];

export default function ImportarPage() {
  return (
    <section aria-labelledby="importar-heading" className="max-w-2xl">
      <h1 id="importar-heading" className="text-2xl font-bold text-white mb-2">
        Importar desde Softguard
      </h1>
      <p className="text-slate-400 mb-8">
        Subí el CSV exportado desde Softguard. El proceso es idempotente — podés
        reimportarlo sin duplicar datos.
      </p>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <CsvUploader />
      </div>

      <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-300">
        <p className="font-medium text-white mb-2">Columnas esperadas en el CSV:</p>
        <ul className="list-disc list-inside space-y-1 font-mono text-xs text-slate-400">
          <li>codigo_cuenta — ID único en Softguard</li>
          <li>nombre — Nombre completo del cliente</li>
          <li>dni — DNI sin puntos (opcional)</li>
          <li>telefono — Formato E.164 (opcional)</li>
          <li>direccion — Dirección del inmueble</li>
          <li>tipo_servicio — ALARMA | DOMOTICA | CAMARA | STARLINK | OTRO</li>
          <li>activa — SI | NO</li>
          <li>zonas — JSON array con zonas/sensores (opcional)</li>
        </ul>
      </div>

      <TutorialContextual
        section="importar"
        titulo="Guía rápida — Importar"
        steps={TUTORIAL_IMPORTAR}
      />
    </section>
  );
}

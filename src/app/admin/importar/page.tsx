import { CsvUploader } from "@/components/admin/CsvUploader";

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
    </section>
  );
}

const TIPO_SENSOR_LABELS: Record<string, string> = {
  SENSOR_PIR:          "Sensor de movimiento",
  CONTACTO_MAGNETICO:  "Contacto magnético",
  CAMARA_IP:           "Cámara IP",
  TECLADO_CONTROL:     "Teclado de control",
  DETECTOR_HUMO:       "Detector de humo",
  MODULO_DOMOTICA:     "Módulo domótica",
  PANICO:              "Botón de pánico",
};

const BATERIA_CONFIG: Record<string, { icon: string; text: string; color: string }> = {
  OPTIMA:       { icon: "●●●", text: "Batería óptima",  color: "text-green-400" },
  ADVERTENCIA:  { icon: "●●○", text: "Batería baja",    color: "text-yellow-400" },
  CRITICA:      { icon: "●○○", text: "Batería crítica", color: "text-red-400" },
};

function tiempoRelativo(fecha: Date | null): string | null {
  if (!fecha) return null;
  const ahora = Date.now();
  const diff = ahora - fecha.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)   return "hace instantes";
  if (min < 60)  return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24)   return `hace ${hs}h`;
  const dias = Math.floor(hs / 24);
  if (dias === 1) return "ayer";
  if (dias < 30)  return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses === 1) return "hace 1 mes";
  if (meses < 12)  return `hace ${meses} meses`;
  const anios = Math.floor(meses / 12);
  return `hace ${anios} año${anios > 1 ? "s" : ""}`;
}

interface SensorItemProps {
  sensor: {
    id: string;
    etiqueta: string;
    tipo: string;
    codigo_zona: string;
    bateria: string | null;
    alerta_mant: boolean;
    activa: boolean;
    ultima_activacion: Date | null;
  };
}

export function SensorItem({ sensor }: SensorItemProps) {
  const batCfg = sensor.bateria ? BATERIA_CONFIG[sensor.bateria] : null;
  const ultimaActiv = tiempoRelativo(sensor.ultima_activacion);

  return (
    <li className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-white">{sensor.etiqueta}</p>
          <p className="text-sm text-slate-400">
            {TIPO_SENSOR_LABELS[sensor.tipo] ?? sensor.tipo} · Zona {sensor.codigo_zona}
          </p>
          {ultimaActiv ? (
            <p className="text-xs text-slate-500 mt-1">
              Última activación:{" "}
              <span className="text-slate-400">{ultimaActiv}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-1 italic">Sin activaciones registradas</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          {batCfg && (
            <span
              className={`text-sm font-medium ${batCfg.color}`}
              aria-label={batCfg.text}
              title={batCfg.text}
            >
              {batCfg.icon}
            </span>
          )}
          {sensor.alerta_mant && (
            <span className="text-xs bg-yellow-900/40 text-yellow-400 font-medium px-2 py-1 rounded-full">
              Mantenimiento
            </span>
          )}
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              sensor.activa
                ? "bg-green-900/40 text-green-400"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {sensor.activa ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>
    </li>
  );
}

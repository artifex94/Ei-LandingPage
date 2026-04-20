// Victoria, Entre Ríos — lat/lon
const LAT = -32.6310;
const LON = -60.1650;

export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "thunderstorm"
  | "storm_hail"
  | "snow"
  | "extreme_heat"
  | "very_hot";

export type SafetyLevel = "green" | "yellow" | "red";

export interface DayForecast {
  date:              string;
  condition:         WeatherCondition;
  safetyLevel:       SafetyLevel;
  maxTemp:           number;
  minTemp:           number;
  maxWind:           number;
  precipProbability: number;
  precipSum:         number;
  dayLabel:          string;  // "Lun"
  dayNumber:         string;  // "21"
  monthLabel:        string;  // "abr"
  isToday:           boolean;
}

// ── WMO code → condition ───────────────────────────────────────────────────────

export function wmoToCondition(
  code: number,
  maxTemp: number,
  maxWind: number
): WeatherCondition {
  // Temperatura extrema sobreescribe condición despejada/parcialmente nublada
  if (code <= 3) {
    if (maxTemp >= 40) return "extreme_heat";
    if (maxTemp >= 35) return "very_hot";
  }
  if (code === 0)                          return "sunny";
  if (code <= 2)                           return "partly_cloudy";
  if (code === 3)                          return "cloudy";
  if (code === 45 || code === 48)          return "fog";
  if (code >= 51 && code <= 57)            return "drizzle";
  if (code >= 61 && code <= 67)            return "rain";
  if (code >= 71 && code <= 77)            return "snow";
  if (code >= 80 && code <= 82)            return "rain";
  if (code >= 85 && code <= 86)            return "snow";
  if (code === 95)                         return "thunderstorm";
  if (code === 96 || code === 99)          return "storm_hail";
  return "cloudy";
}

// ── Safety level ───────────────────────────────────────────────────────────────

export function getSafetyLevel(
  condition: WeatherCondition,
  maxTemp: number,
  maxWind: number
): SafetyLevel {
  // Rojo: condiciones de alto riesgo
  if (
    condition === "storm_hail" ||
    condition === "extreme_heat" ||
    maxWind >= 50
  ) return "red";

  // Amarillo: precaución
  if (
    condition === "thunderstorm" ||
    condition === "rain"         ||
    condition === "snow"         ||
    condition === "very_hot"     ||
    condition === "drizzle"      ||
    maxWind >= 30
  ) return "yellow";

  return "green";
}

// ── Tema visual por condición ──────────────────────────────────────────────────

export interface ConditionTheme {
  gradientFrom: string;
  gradientTo:   string;
  emoji:        string;
  label:        string;
  lightText:    boolean; // true = texto blanco
}

export const CONDITION_THEME: Record<WeatherCondition, ConditionTheme> = {
  sunny:         { gradientFrom: "#f59e0b", gradientTo: "#ea580c", emoji: "☀️",  label: "Despejado",     lightText: true  },
  very_hot:      { gradientFrom: "#fbbf24", gradientTo: "#b45309", emoji: "🏜️", label: "Mucho calor",   lightText: true  },
  extreme_heat:  { gradientFrom: "#b45309", gradientTo: "#7f1d1d", emoji: "🌡️", label: "Calor extremo", lightText: true  },
  partly_cloudy: { gradientFrom: "#7dd3fc", gradientTo: "#3b82f6", emoji: "⛅",  label: "Parcial",       lightText: true  },
  cloudy:        { gradientFrom: "#64748b", gradientTo: "#1e293b", emoji: "☁️",  label: "Nublado",       lightText: true  },
  fog:           { gradientFrom: "#94a3b8", gradientTo: "#475569", emoji: "🌫️", label: "Niebla",        lightText: true  },
  drizzle:       { gradientFrom: "#93c5fd", gradientTo: "#475569", emoji: "🌦️", label: "Llovizna",      lightText: true  },
  rain:          { gradientFrom: "#1d4ed8", gradientTo: "#0f172a", emoji: "🌧️", label: "Lluvia",        lightText: true  },
  thunderstorm:  { gradientFrom: "#1e293b", gradientTo: "#3b0764", emoji: "⛈️",  label: "Tormenta",      lightText: true  },
  storm_hail:    { gradientFrom: "#0f172a", gradientTo: "#0c1a2e", emoji: "🌨️", label: "Granizo",       lightText: true  },
  snow:          { gradientFrom: "#dde8f0", gradientTo: "#bfdbfe", emoji: "❄️",  label: "Nieve",         lightText: false },
};

// ── Fetch ──────────────────────────────────────────────────────────────────────

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export async function fetchWeatherForecast(): Promise<DayForecast[] | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
      `wind_speed_10m_max,precipitation_sum,precipitation_probability_max` +
      `&timezone=America%2FArgentina%2FBuenos_Aires` +
      `&forecast_days=7`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const json = await res.json() as {
      daily: {
        time:                         string[];
        weather_code:                 number[];
        temperature_2m_max:           number[];
        temperature_2m_min:           number[];
        wind_speed_10m_max:           number[];
        precipitation_sum:            number[];
        precipitation_probability_max: number[];
      };
    };

    const { time, weather_code, temperature_2m_max, temperature_2m_min,
            wind_speed_10m_max, precipitation_sum, precipitation_probability_max } = json.daily;

    const todayStr = new Date().toISOString().slice(0, 10);

    return time.map((dateStr, i) => {
      const d          = new Date(`${dateStr}T12:00:00`);
      const maxTemp    = Math.round(temperature_2m_max[i]);
      const minTemp    = Math.round(temperature_2m_min[i]);
      const maxWind    = Math.round(wind_speed_10m_max[i]);
      const precipProb = precipitation_probability_max[i] ?? 0;
      const precipSum  = Math.round((precipitation_sum[i] ?? 0) * 10) / 10;
      const code       = weather_code[i];
      const condition  = wmoToCondition(code, maxTemp, maxWind);
      const safety     = getSafetyLevel(condition, maxTemp, maxWind);

      return {
        date:              dateStr,
        condition,
        safetyLevel:       safety,
        maxTemp,
        minTemp,
        maxWind,
        precipProbability: precipProb,
        precipSum,
        dayLabel:          DIAS_ES[d.getDay()],
        dayNumber:         String(d.getDate()),
        monthLabel:        MESES_ES[d.getMonth()],
        isToday:           dateStr === todayStr,
      };
    });
  } catch {
    return null;
  }
}

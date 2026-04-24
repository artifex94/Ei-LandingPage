/**
 * seed-sensores-softguard.ts
 *
 * Importa todas las zonas de m_zonas (SoftGuard SQL Server) como Sensores
 * en la BD de Supabase, vinculadas a sus Cuentas por softguard_ref.
 *
 * Estrategia de tipo:
 *   - Zona con código SP*              → PANICO (SmartPanics)
 *   - Descripción contiene CAMARA/CCTV → CAMARA_IP
 *   - Descripción contiene TECLADO     → TECLADO_CONTROL
 *   - Descripción contiene HUMO/INCEND → DETECTOR_HUMO
 *   - Descripción contiene PANICO/SOS  → PANICO
 *   - Descripción contiene DOMOTICA    → MODULO_DOMOTICA
 *   - Código numérico o PUERTA/VENTANA → CONTACTO_MAGNETICO
 *   - Default                          → SENSOR_PIR
 *
 * Uso:
 *   cd frontend/Ei-LandingPage
 *   npx tsx scripts/seed-sensores-softguard.ts
 */

import "dotenv/config";
import sql from "mssql";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const sgConfig: sql.config = {
  server:   process.env.SOFTGUARD_DB_HOST!,
  port:     parseInt(process.env.SOFTGUARD_DB_PORT ?? "1433", 10),
  user:     process.env.SOFTGUARD_DB_USER!,
  password: process.env.SOFTGUARD_DB_PASS!,
  database: process.env.SOFTGUARD_DB_NAME!,
  options:  { trustServerCertificate: true, encrypt: true, connectTimeout: 10000 },
};

type TipoSensor =
  | "SENSOR_PIR"
  | "CONTACTO_MAGNETICO"
  | "CAMARA_IP"
  | "TECLADO_CONTROL"
  | "DETECTOR_HUMO"
  | "MODULO_DOMOTICA"
  | "PANICO";

function inferirTipo(codigo: string, descripcion: string): TipoSensor {
  const cod = codigo.trim().toUpperCase();
  const desc = descripcion.trim().toUpperCase();

  if (cod.startsWith("SP"))                                   return "PANICO";
  if (desc.includes("CAMARA") || desc.includes("CCTV"))       return "CAMARA_IP";
  if (desc.includes("TECLADO") || desc.includes("KEYPAD"))    return "TECLADO_CONTROL";
  if (desc.includes("HUMO") || desc.includes("INCEND"))       return "DETECTOR_HUMO";
  if (desc.includes("PANICO") || desc.includes("SOS"))        return "PANICO";
  if (desc.includes("DOMOTICA") || desc.includes("RELE"))     return "MODULO_DOMOTICA";
  if (desc.includes("PUERTA") || desc.includes("VENTANA") ||
      desc.includes("CONTACTO") || desc.includes("REJA") ||
      desc.includes("PORTON") || /^\d+$/.test(cod))           return "CONTACTO_MAGNETICO";
  return "SENSOR_PIR";
}

async function main() {
  console.log("Conectando a SoftGuard...");
  const pool = await sql.connect(sgConfig);

  const { recordset: zonas } = await pool.request().query<{
    iid_cuenta: number;
    softguard_ref: string;
    codigo: string;
    descripcion: string;
    mostrar: number;
  }>(`
    SELECT
      c.cue_iid                    AS iid_cuenta,
      RTRIM(c.cue_ncuenta)         AS softguard_ref,
      RTRIM(z.zon_ccodigo)         AS codigo,
      RTRIM(z.zon_cdescripcion)    AS descripcion,
      z.zon_nmostrar               AS mostrar
    FROM dbo.m_zonas z
    JOIN dbo.m_cuentas c ON c.cue_iid = z.zon_iidcuenta
    WHERE RTRIM(c.cue_clinea) NOT LIKE '!_%' ESCAPE '!'
      AND RTRIM(c.cue_ncuenta) != '0000'
    ORDER BY c.cue_ncuenta, z.zon_ccodigo
  `);

  await pool.close();
  console.log(`Zonas obtenidas de SoftGuard: ${zonas.length}`);

  // Cargar todas las Cuentas del portal de una vez (lookup rápido)
  // Portal usa "ESI-0001", "SG-00001" — SoftGuard devuelve "0001".
  // Normalizamos ambos lados a entero para hacer match.
  const cuentas = await prisma.cuenta.findMany({
    select: { id: true, softguard_ref: true },
  });
  // Solo indexar cuentas ESI-XXXX: son las que vienen directamente de SoftGuard.
  // TST- y SG- tienen otra procedencia y causarían colisiones en el lookup numérico.
  const cuentaMap = new Map<number, string>();
  for (const c of cuentas) {
    if (!c.softguard_ref.startsWith("ESI-")) continue;
    const num = parseInt(c.softguard_ref.slice(4), 10);
    if (!isNaN(num)) cuentaMap.set(num, c.id);
  }
  console.log(`Cuentas en el portal: ${cuentas.length} (${cuentaMap.size} con prefijo ESI-)*`);

  let creados   = 0;
  let omitidos  = 0;  // cuenta no encontrada en el portal
  let errores   = 0;

  for (const z of zonas) {
    const cuenta_id = cuentaMap.get(parseInt(z.softguard_ref, 10));
    if (!cuenta_id) {
      omitidos++;
      continue;
    }

    const tipo    = inferirTipo(z.codigo, z.descripcion);
    // mostrar=1 → activa, mostrar=2 (SmartPanics virtual) → activa igual, 0 → inactiva
    const activa  = z.mostrar !== 0;

    try {
      await prisma.sensor.upsert({
        where: {
          cuenta_id_codigo_zona: { cuenta_id, codigo_zona: z.codigo },
        },
        create: {
          cuenta_id,
          codigo_zona: z.codigo,
          etiqueta:    z.descripcion || `Zona ${z.codigo}`,
          tipo,
          activa,
        },
        update: {
          etiqueta: z.descripcion || `Zona ${z.codigo}`,
          tipo,
          activa,
        },
      });
      creados++;
    } catch (e) {
      console.error(`  Error zona ${z.softguard_ref}/${z.codigo}:`, (e as Error).message);
      errores++;
    }
  }

  console.log("\n── Resultado ──────────────────────────");
  console.log(`  Zonas procesadas : ${zonas.length}`);
  console.log(`  Sensores creados : ${creados}`);
  console.log(`  Sin cuenta match : ${omitidos}`);
  console.log(`  Errores          : ${errores}`);
  console.log("───────────────────────────────────────");

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

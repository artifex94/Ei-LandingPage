/**
 * import-clientes.ts
 * -------------------
 * Importa personas_juridicas + cuentas desde la BD local (dump SQL) a Supabase/Prisma.
 *
 * Uso:
 *   npx tsx scripts/import-clientes.ts            → dry-run (solo muestra qué haría)
 *   npx tsx scripts/import-clientes.ts --apply    → aplica los cambios reales
 *
 * Qué hace:
 * 1. Por cada persona_juridica → crea Supabase Auth user + Perfil en Prisma
 * 2. Por cada cuenta           → crea Cuenta en Prisma (softguard_ref = ESI-XXXX)
 * 3. Cruza con el XLS de Softguard para obtener email/teléfono
 * 4. Es idempotente: verifica si ya existe antes de crear
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { read, utils } from "xlsx";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ── Configuración ─────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes("--apply");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;
const XLS_PATH = path.resolve(__dirname, "../../../database/Reporte Cuentas 15_04_2026 at 11.25.27.xls");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error("❌ Faltan variables de entorno. Asegurate de tener .env.local en la raíz del proyecto Next.js.");
  process.exit(1);
}

// ── Clientes ──────────────────────────────────────────────────────────────────

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Datos del dump local (hardcoded desde el dump SQL) ────────────────────────

interface PersonaJuridica {
  id_persona: number;
  nombre_razon_social: string;
  fecha_alta: Date;
}

interface CuentaLocal {
  id_cuenta: string;   // "0001", "0002", etc.
  nombre_cuenta: string;
  id_persona_juridica: number;
}

const PERSONAS: PersonaJuridica[] = [
  { id_persona: 1,  nombre_razon_social: "Federico Sanchez Boado",          fecha_alta: new Date("2026-03-22") },
  { id_persona: 2,  nombre_razon_social: "Ernesto Sobrero",                  fecha_alta: new Date("2026-03-22") },
  { id_persona: 3,  nombre_razon_social: "Luis Medrano",                     fecha_alta: new Date("2026-03-22") },
  { id_persona: 4,  nombre_razon_social: "Silvina Maiocco",                  fecha_alta: new Date("2026-03-22") },
  { id_persona: 5,  nombre_razon_social: "Luis Alasino",                     fecha_alta: new Date("2026-03-22") },
  { id_persona: 6,  nombre_razon_social: "Emilio Guaita",                    fecha_alta: new Date("2026-03-22") },
  { id_persona: 7,  nombre_razon_social: "Luis Marquez",                     fecha_alta: new Date("2026-03-22") },
  { id_persona: 8,  nombre_razon_social: "Fernando Arredondo",               fecha_alta: new Date("2026-03-22") },
  { id_persona: 9,  nombre_razon_social: "Ricardo Godoy",                    fecha_alta: new Date("2026-03-22") },
  { id_persona: 10, nombre_razon_social: "Andres Anca",                      fecha_alta: new Date("2026-03-22") },
  { id_persona: 11, nombre_razon_social: "Marina Langbein",                  fecha_alta: new Date("2026-03-22") },
  { id_persona: 12, nombre_razon_social: "Muy Barato",                       fecha_alta: new Date("2026-03-22") },
  { id_persona: 13, nombre_razon_social: "Tabachi Sergio",                   fecha_alta: new Date("2026-03-22") },
  { id_persona: 14, nombre_razon_social: "Botto Alberto",                    fecha_alta: new Date("2026-03-22") },
  { id_persona: 15, nombre_razon_social: "Humberto Nuñez",                   fecha_alta: new Date("2026-03-22") },
  { id_persona: 16, nombre_razon_social: "Cesar Diaz",                       fecha_alta: new Date("2026-03-22") },
  { id_persona: 17, nombre_razon_social: "Hugo Gilli",                       fecha_alta: new Date("2026-03-22") },
  { id_persona: 18, nombre_razon_social: "Martinez Roberto",                 fecha_alta: new Date("2026-03-22") },
  { id_persona: 19, nombre_razon_social: "Alimentos y Aceitera Ruta 12",     fecha_alta: new Date("2026-03-22") },
  { id_persona: 20, nombre_razon_social: "Daniel Gonzalez",                  fecha_alta: new Date("2026-03-22") },
  { id_persona: 21, nombre_razon_social: "Ma. Irene Arreceigor",             fecha_alta: new Date("2026-03-22") },
  { id_persona: 22, nombre_razon_social: "Medrano Elida",                    fecha_alta: new Date("2026-03-22") },
  { id_persona: 23, nombre_razon_social: "Ballestena Conrado",               fecha_alta: new Date("2026-03-22") },
  { id_persona: 24, nombre_razon_social: "Felipe Anza",                      fecha_alta: new Date("2026-03-22") },
  { id_persona: 25, nombre_razon_social: "Farmacia Social",                  fecha_alta: new Date("2026-03-22") },
  { id_persona: 26, nombre_razon_social: "Carlos Codari",                    fecha_alta: new Date("2026-03-22") },
  { id_persona: 27, nombre_razon_social: "Ebenezer Garcia",                  fecha_alta: new Date("2026-03-22") },
  { id_persona: 28, nombre_razon_social: "Farmacia Bancaria",                fecha_alta: new Date("2026-03-22") },
  { id_persona: 29, nombre_razon_social: "Facundo Dyner",                    fecha_alta: new Date("2026-03-22") },
  { id_persona: 30, nombre_razon_social: "Marisa Alvarez",                   fecha_alta: new Date("2026-03-22") },
  { id_persona: 31, nombre_razon_social: "Maiocco Cereales",                 fecha_alta: new Date("2026-03-22") },
  { id_persona: 32, nombre_razon_social: "Valeria Spelzini / Pablo Rojas",   fecha_alta: new Date("2026-03-22") },
  { id_persona: 33, nombre_razon_social: "Gonzalez Beatriz",                 fecha_alta: new Date("2026-03-22") },
  { id_persona: 34, nombre_razon_social: "Claudia Francischelli",            fecha_alta: new Date("2026-03-22") },
  { id_persona: 35, nombre_razon_social: "Agroinsumos Victoria",             fecha_alta: new Date("2026-03-22") },
  { id_persona: 36, nombre_razon_social: "Lucio Merzbacher",                 fecha_alta: new Date("2026-03-22") },
  { id_persona: 37, nombre_razon_social: "Ferreteria Matanza",               fecha_alta: new Date("2026-03-22") },
  { id_persona: 38, nombre_razon_social: "Dario Francischelli",              fecha_alta: new Date("2026-03-22") },
  { id_persona: 39, nombre_razon_social: "Adolfo Cartas",                    fecha_alta: new Date("2026-03-22") },
];

const CUENTAS_LOCAL: CuentaLocal[] = [
  { id_cuenta: "0001", nombre_cuenta: "Federico Sanchez Boado",      id_persona_juridica: 1 },
  { id_cuenta: "0002", nombre_cuenta: "Veterinaria San Francisco",    id_persona_juridica: 2 },
  { id_cuenta: "0003", nombre_cuenta: "Luis Medrano",                 id_persona_juridica: 3 },
  { id_cuenta: "0004", nombre_cuenta: "Silvina Maiocco",              id_persona_juridica: 4 },
  { id_cuenta: "0005", nombre_cuenta: "Luis Alasino",                 id_persona_juridica: 5 },
  { id_cuenta: "0006", nombre_cuenta: "Emilio Guaita",                id_persona_juridica: 6 },
  { id_cuenta: "0007", nombre_cuenta: "Chuni Marquez",                id_persona_juridica: 7 },
  { id_cuenta: "0046", nombre_cuenta: "Marquez Luis",                 id_persona_juridica: 7 },
  { id_cuenta: "0095", nombre_cuenta: "Luis Campo Hernandez",         id_persona_juridica: 7 },
  { id_cuenta: "0008", nombre_cuenta: "Justo Jose Balneario",         id_persona_juridica: 8 },
  { id_cuenta: "0122", nombre_cuenta: "Justo Jose Bar",               id_persona_juridica: 8 },
  { id_cuenta: "0009", nombre_cuenta: "Godoy",                        id_persona_juridica: 9 },
  { id_cuenta: "0010", nombre_cuenta: "Godoy Ricardo",                id_persona_juridica: 9 },
  { id_cuenta: "0011", nombre_cuenta: "Andres",                       id_persona_juridica: 10 },
  { id_cuenta: "0012", nombre_cuenta: "Laberinto",                    id_persona_juridica: 11 },
  { id_cuenta: "0146", nombre_cuenta: "Marina Langbein",              id_persona_juridica: 11 },
  { id_cuenta: "0013", nombre_cuenta: "Muy Barato Nogoya",            id_persona_juridica: 12 },
  { id_cuenta: "0039", nombre_cuenta: "Muy Barato",                   id_persona_juridica: 12 },
  { id_cuenta: "0014", nombre_cuenta: "Tabachi Sergio",               id_persona_juridica: 13 },
  { id_cuenta: "0015", nombre_cuenta: "Botto",                        id_persona_juridica: 14 },
  { id_cuenta: "0016", nombre_cuenta: "Bocha Nuñez",                  id_persona_juridica: 15 },
  { id_cuenta: "0060", nombre_cuenta: "Copello Repuestos",            id_persona_juridica: 15 },
  { id_cuenta: "0018", nombre_cuenta: "Victenis",                     id_persona_juridica: 16 },
  { id_cuenta: "0036", nombre_cuenta: "Division Ruedas Victoria",     id_persona_juridica: 16 },
  { id_cuenta: "0044", nombre_cuenta: "Cesar Diaz Chacra",            id_persona_juridica: 16 },
  { id_cuenta: "0047", nombre_cuenta: "Division Ruedas Nogoya",       id_persona_juridica: 16 },
  { id_cuenta: "0055", nombre_cuenta: "Cesar Diaz Chacra",            id_persona_juridica: 16 },
  { id_cuenta: "0106", nombre_cuenta: "Division Ruedas Gualeguay",    id_persona_juridica: 16 },
  { id_cuenta: "0168", nombre_cuenta: "Division Ruedas Diamante",     id_persona_juridica: 16 },
  { id_cuenta: "0169", nombre_cuenta: "Division Ruedas Nogoya",       id_persona_juridica: 16 },
  { id_cuenta: "0019", nombre_cuenta: "Hugo Gilli",                   id_persona_juridica: 17 },
  { id_cuenta: "0020", nombre_cuenta: "Martinez Roberto",             id_persona_juridica: 18 },
  { id_cuenta: "0021", nombre_cuenta: "Alimentos y Aceitera Ruta 12", id_persona_juridica: 19 },
  { id_cuenta: "0022", nombre_cuenta: "Daniel Gonzalez",              id_persona_juridica: 20 },
  { id_cuenta: "0031", nombre_cuenta: "Daniel Gonzales Casa",         id_persona_juridica: 20 },
  { id_cuenta: "0023", nombre_cuenta: "Maria Irene Arreceigor",       id_persona_juridica: 21 },
  { id_cuenta: "0024", nombre_cuenta: "Medrano",                      id_persona_juridica: 22 },
  { id_cuenta: "0025", nombre_cuenta: "Ballestena",                   id_persona_juridica: 23 },
  { id_cuenta: "0026", nombre_cuenta: "Veterinaria La Yunta",         id_persona_juridica: 24 },
  { id_cuenta: "0027", nombre_cuenta: "Cec",                          id_persona_juridica: 25 },
  { id_cuenta: "0098", nombre_cuenta: "Farmacia Social",              id_persona_juridica: 25 },
  { id_cuenta: "0117", nombre_cuenta: "Cec Centro",                   id_persona_juridica: 25 },
  { id_cuenta: "0028", nombre_cuenta: "Agro Servicios Codari",        id_persona_juridica: 26 },
  { id_cuenta: "0029", nombre_cuenta: "Galpon Copello",               id_persona_juridica: 27 },
  { id_cuenta: "0040", nombre_cuenta: "Ebenezer Garcia Chacra",       id_persona_juridica: 27 },
  { id_cuenta: "0045", nombre_cuenta: "E Y H",                        id_persona_juridica: 27 },
  { id_cuenta: "0056", nombre_cuenta: "E Y H Planta",                 id_persona_juridica: 27 },
  { id_cuenta: "0147", nombre_cuenta: "Ebenezer Garcia Galpon",       id_persona_juridica: 27 },
  { id_cuenta: "0030", nombre_cuenta: "Farmacia Bancaria",            id_persona_juridica: 28 },
  { id_cuenta: "0032", nombre_cuenta: "Facundo Celular",              id_persona_juridica: 29 },
  { id_cuenta: "0033", nombre_cuenta: "Alvarez Marisa",               id_persona_juridica: 30 },
  { id_cuenta: "0034", nombre_cuenta: "Maiocco Cereales",             id_persona_juridica: 31 },
  { id_cuenta: "0102", nombre_cuenta: "La Horqueta",                  id_persona_juridica: 31 },
  { id_cuenta: "0112", nombre_cuenta: "Agroquimico Oficina Maiocco",  id_persona_juridica: 31 },
  { id_cuenta: "0130", nombre_cuenta: "Aispuro Marisa",               id_persona_juridica: 31 },
  { id_cuenta: "0134", nombre_cuenta: "Maiocco Cereales Planta",      id_persona_juridica: 31 },
  { id_cuenta: "0192", nombre_cuenta: "Alejandro Maiocco",            id_persona_juridica: 31 },
  { id_cuenta: "0035", nombre_cuenta: "Valeria",                      id_persona_juridica: 32 },
  { id_cuenta: "0109", nombre_cuenta: "Valeria Rosario",              id_persona_juridica: 32 },
  { id_cuenta: "0110", nombre_cuenta: "Gonzalez Beatriz",             id_persona_juridica: 33 },
  { id_cuenta: "0111", nombre_cuenta: "Claudia Francischelli",        id_persona_juridica: 34 },
  { id_cuenta: "0113", nombre_cuenta: "Agroinsumos Victoria",         id_persona_juridica: 35 },
  { id_cuenta: "0037", nombre_cuenta: "Lucio Mezbacher",              id_persona_juridica: 36 },
  { id_cuenta: "0162", nombre_cuenta: "(Con rastreos)",               id_persona_juridica: 36 },
  { id_cuenta: "0038", nombre_cuenta: "Juan (Ferreteria Matanza)",    id_persona_juridica: 37 },
  { id_cuenta: "0107", nombre_cuenta: "Ferreteria Matanza",           id_persona_juridica: 37 },
  { id_cuenta: "0164", nombre_cuenta: "Ferreteria Matanza II",        id_persona_juridica: 37 },
  { id_cuenta: "0183", nombre_cuenta: "Look Total",                   id_persona_juridica: 37 },
  { id_cuenta: "0041", nombre_cuenta: "Santa Ana",                    id_persona_juridica: 38 },
  { id_cuenta: "0084", nombre_cuenta: "Dario Francischelli",          id_persona_juridica: 38 },
  { id_cuenta: "0042", nombre_cuenta: "Adolfo Cartas",                id_persona_juridica: 39 },
  { id_cuenta: "0148", nombre_cuenta: "Agata",                        id_persona_juridica: 39 },
  { id_cuenta: "0187", nombre_cuenta: "Adolfo Solar",                 id_persona_juridica: 39 },
];

// ── Cuentas huérfanas → vincular a perfiles ya existentes ────────────────────
// Razón de cada asignación documentada junto a la entrada.

const CUENTAS_VINCULADAS_EXISTENTES: CuentaLocal[] = [
  // ESI-0069 "CRISTIAN MAIOCCO" comparte email cristhianmaiocco@icloud.com con Persona #31
  { id_cuenta: "0069", nombre_cuenta: "Cristian Maiocco",               id_persona_juridica: 31 },
  // ESI-0048 "GUSTAVO CODARI CASA" — apellido Codari = Carlos Codari (#26), casa residencial
  { id_cuenta: "0048", nombre_cuenta: "Gustavo Codari Casa",            id_persona_juridica: 26 },
  // ESI-0100 "SERGIO TABACHI" — mismo titular que Tabachi Sergio (#13), nombre invertido
  { id_cuenta: "0100", nombre_cuenta: "Sergio Tabachi",                 id_persona_juridica: 13 },
  // ESI-0145 "DIVISIÓN RUEDAS GUALEGUAYCHÚ" — red de locales de Cesar Diaz (#16)
  { id_cuenta: "0145", nombre_cuenta: "División Ruedas Gualeguaychú",   id_persona_juridica: 16 },
];

// ── Personas huérfanas (cuentas en Softguard sin cliente en la BD local) ─────
// Agrupadas por email compartido, apellido o patrón de negocio donde es evidente.
// Las demás son cuentas individuales. ESI-999A "PRUEBAS" se omite.

interface PersonaHuerfana {
  id_persona: number;   // 40 en adelante, solo para el mapa interno
  nombre: string;
  email: string | null;
  cuentas: Array<{ id_cuenta: string; nombre_cuenta: string }>;
}

const PERSONAS_HUERFANAS: PersonaHuerfana[] = [
  // ── Grupos con múltiples cuentas detectados por email compartido ──────────
  {
    id_persona: 40, nombre: "Gustavo Monje", email: "gustavomision@gmail.com",
    // gustavomision@gmail.com aparece en Guardería Náutica, dos "Gustavo Monje", Mision S.A.
    // y Depósito Mision (arielescobar placeholder pero mismo patrón de negocio Mision/Rosario)
    cuentas: [
      { id_cuenta: "0043", nombre_cuenta: "Guardería Náutica" },
      { id_cuenta: "0052", nombre_cuenta: "Gustavo Monje" },
      { id_cuenta: "0096", nombre_cuenta: "Depósito Mision" },
      { id_cuenta: "0103", nombre_cuenta: "Gustavo Monje" },
      { id_cuenta: "0126", nombre_cuenta: "Mision S.A." },
    ],
  },
  {
    id_persona: 41, nombre: "Lisandro Rourich", email: "lisandro.rourich@elmalacate.com.ar",
    // Mismo email en ESI-0070 y ESI-0071, ambas cuentas "El Malacate" / "Oficina Malacate"
    cuentas: [
      { id_cuenta: "0070", nombre_cuenta: "El Malacate" },
      { id_cuenta: "0071", nombre_cuenta: "Oficina Malacate" },
    ],
  },
  {
    id_persona: 42, nombre: "Jose Luis Pittaluga", email: "joseluispittaluga61@gmail.com",
    // ESI-0090 C.B.C.HORMIGON con ese email; ESI-0133 CBC-RUTA11 sin email, mismo patrón CBC
    cuentas: [
      { id_cuenta: "0090", nombre_cuenta: "C.B.C. Hormigon" },
      { id_cuenta: "0133", nombre_cuenta: "CBC Ruta 11" },
    ],
  },
  {
    id_persona: 43, nombre: "Fabio Garcia Roman", email: "fabiogarciaroman@gmail.com",
    // ESI-0049 "MIRADOR DEL RÍO" tiene ese email; ESI-0181 "FABIO GARCIA" comparte titular
    cuentas: [
      { id_cuenta: "0049", nombre_cuenta: "Mirador del Río" },
      { id_cuenta: "0181", nombre_cuenta: "Fabio Garcia" },
    ],
  },
  {
    id_persona: 44, nombre: "Gustavo Casella", email: "cagusda@gmail.com",
    // ESI-0167 tiene email cagusda@gmail.com y tel 3416048409;
    // ESI-0139 "GUSTAVO ALARMA QUINTO" tiene el mismo número (3416048409) como email (error de carga)
    cuentas: [
      { id_cuenta: "0139", nombre_cuenta: "Gustavo Alarma Quinto" },
      { id_cuenta: "0167", nombre_cuenta: "Gustavo Casella" },
    ],
  },

  // ── Cuentas individuales (un titular, un email o sin datos de contacto) ───
  { id_persona: 45,  nombre: "Las Malvinas",              email: null,                                   cuentas: [{ id_cuenta: "0017", nombre_cuenta: "Las Malvinas" }] },
  { id_persona: 46,  nombre: "Ricardo Reynoso",           email: null,                                   cuentas: [{ id_cuenta: "0050", nombre_cuenta: "Reynoso Ricardo Lote 142 Solar" }] },
  { id_persona: 47,  nombre: "Adriana Maiocco",           email: null,                                   cuentas: [{ id_cuenta: "0051", nombre_cuenta: "Adriana Maiocco" }] },
  { id_persona: 48,  nombre: "Ignacio Martinez",          email: "igntinez@gmail.com",                   cuentas: [{ id_cuenta: "0053", nombre_cuenta: "Ignacio Martinez" }] },
  { id_persona: 49,  nombre: "Miriam Anghilante",         email: "mranghilante@gmail.com",               cuentas: [{ id_cuenta: "0054", nombre_cuenta: "Miriam Rosana Anghilante" }] },
  { id_persona: 50,  nombre: "Mercedes Leguizamon",       email: "mercedesleguizamonn71@gmail.com",      cuentas: [{ id_cuenta: "0057", nombre_cuenta: "Mercedes Leguizamon" }] },
  { id_persona: 51,  nombre: "Yamil Hamdan",              email: "yamilhamdan@hotmail.com.ar",           cuentas: [{ id_cuenta: "0058", nombre_cuenta: "Ajmito" }] },
  { id_persona: 52,  nombre: "Juan Carlos Merzbacher",    email: "merzbacherjc@gmail.com",               cuentas: [{ id_cuenta: "0059", nombre_cuenta: "Juan Carlos Merzbacher" }] },
  { id_persona: 53,  nombre: "Arturo Enriquez",           email: null,                                   cuentas: [{ id_cuenta: "0061", nombre_cuenta: "Arturo Enriquez" }] },
  { id_persona: 54,  nombre: "Alejandro Corvoisier",      email: "alejandrocorvo810@gmail.com",          cuentas: [{ id_cuenta: "0066", nombre_cuenta: "Corvoisier Alejandro" }] },
  { id_persona: 55,  nombre: "Emilio Mateos",             email: "brunildasivero@gmail.com",             cuentas: [{ id_cuenta: "0067", nombre_cuenta: "Emilio Mateos" }] },
  { id_persona: 56,  nombre: "Farmacia Rausch",           email: "rauschalicia@gmail.com",               cuentas: [{ id_cuenta: "0068", nombre_cuenta: "Farmacia Rausch" }] },
  { id_persona: 57,  nombre: "Horacio Saldaña",           email: "horaciosaldania628@gmail.com",         cuentas: [{ id_cuenta: "0072", nombre_cuenta: "Saldaña" }] },
  { id_persona: 58,  nombre: "Gustavo Ferreyra",          email: "gustavoferreyra319@gmail.com",         cuentas: [{ id_cuenta: "0073", nombre_cuenta: "Parque Gaucho" }] },
  { id_persona: 59,  nombre: "Enrique Fonaroff",          email: "fonaroffenrique@gmail.com",            cuentas: [{ id_cuenta: "0074", nombre_cuenta: "Las Tipas Lote 14" }] },
  { id_persona: 60,  nombre: "Mauricio Trujillo",         email: "mauriciotrujillo71@hotmail.com",       cuentas: [{ id_cuenta: "0075", nombre_cuenta: "Mauricio" }] },
  { id_persona: 61,  nombre: "Aldo Basa",                 email: "aldobasa15@gmail.com",                 cuentas: [{ id_cuenta: "0076", nombre_cuenta: "El Vasco" }] },
  { id_persona: 62,  nombre: "Patricia Coronel",          email: "patriciacoronel828@gmail.com",         cuentas: [{ id_cuenta: "0077", nombre_cuenta: "Despensa Patry" }] },
  { id_persona: 63,  nombre: "El Molino",                 email: "mggmariela@gmail.com",                 cuentas: [{ id_cuenta: "0078", nombre_cuenta: "El Molino" }] },
  { id_persona: 64,  nombre: "Griselda B.",               email: "griseldab_18@hotmail.com",             cuentas: [{ id_cuenta: "0079", nombre_cuenta: "Griselda" }] },
  { id_persona: 65,  nombre: "Alejandra Firpo",           email: "alejandrafirpo007@gmail.com",          cuentas: [{ id_cuenta: "0080", nombre_cuenta: "Alejandra Firpo" }] },
  { id_persona: 66,  nombre: "Ricardo Marraffino",        email: "ricardomarraffino@gmail.com",          cuentas: [{ id_cuenta: "0081", nombre_cuenta: "Ricardo Marraffino" }] },
  { id_persona: 67,  nombre: "Online Entre Rios",         email: "rmuzzachiodi@casinovictoria.com.ar",   cuentas: [{ id_cuenta: "0082", nombre_cuenta: "On Line Entre Rios" }] },
  { id_persona: 68,  nombre: "Hugo Santucho",             email: "hugonelsonsantucho@gmail.com",         cuentas: [{ id_cuenta: "0083", nombre_cuenta: "Hugo Santucho" }] },
  { id_persona: 69,  nombre: "Gabriela Risso",            email: "mgrisso1960@gmail.com",                cuentas: [{ id_cuenta: "0085", nombre_cuenta: "Gabriela Risso" }] },
  { id_persona: 70,  nombre: "Nelci Provinciali",         email: "nelciprovinciali@gmail.com",           cuentas: [{ id_cuenta: "0086", nombre_cuenta: "Nelci Lujan Provinciali" }] },
  { id_persona: 71,  nombre: "Santiago Grierson",         email: "santiagogrierson@gmail.com",           cuentas: [{ id_cuenta: "0087", nombre_cuenta: "Santiago Grierson" }] },
  { id_persona: 72,  nombre: "Maricela Faccendini",       email: "faccendinimaricela@gmail.com",         cuentas: [{ id_cuenta: "0088", nombre_cuenta: "Maricela Faccendini" }] },
  { id_persona: 73,  nombre: "Andres Lozano",             email: "yolialberta@gmail.com",                cuentas: [{ id_cuenta: "0089", nombre_cuenta: "Andres Lozano" }] },
  { id_persona: 74,  nombre: "Claudia Albornoz",          email: null,                                   cuentas: [{ id_cuenta: "0091", nombre_cuenta: "Claudia Albornoz" }] },
  { id_persona: 75,  nombre: "Humberto Vechette",         email: null,                                   cuentas: [{ id_cuenta: "0092", nombre_cuenta: "Vechette Humberto" }] },
  { id_persona: 76,  nombre: "Olga Ines Brassesco",       email: "bussimariaeugenia@gmail.com",          cuentas: [{ id_cuenta: "0093", nombre_cuenta: "Olga Ines Venancia Brassesco" }] },
  { id_persona: 77,  nombre: "Edgardo Garcia",            email: null,                                   cuentas: [{ id_cuenta: "0094", nombre_cuenta: "Edgardo Garcia" }] },
  { id_persona: 78,  nombre: "Agencia Victoria",          email: "agenciavictoria168@gmail.com",         cuentas: [{ id_cuenta: "0097", nombre_cuenta: "Agencia Victoria" }] },
  { id_persona: 79,  nombre: "Francisco Ramirez",         email: "franciscoramirezvic@gmail.com",        cuentas: [{ id_cuenta: "0099", nombre_cuenta: "Tio Martin" }] },
  { id_persona: 80,  nombre: "Oscar Fajouri",             email: "info.promaq@gmail.com",                cuentas: [{ id_cuenta: "0101", nombre_cuenta: "Oscar Fajouri" }] },
  { id_persona: 81,  nombre: "Francisco Marquez",         email: "brendadnicora@hotmail.com",            cuentas: [{ id_cuenta: "0104", nombre_cuenta: "Francisco Marquez" }] },
  { id_persona: 82,  nombre: "Carlos Alberto Santini",    email: "santinicarlosalberto@gmail.com",       cuentas: [{ id_cuenta: "0105", nombre_cuenta: "Santini Carlos Alberto" }] },
  { id_persona: 83,  nombre: "Andrés Morán",              email: "andresmoran115@gmail.com",             cuentas: [{ id_cuenta: "0108", nombre_cuenta: "Andrés Morán" }] },
  // ESI-0114 ROBERTO ZORDAN: email marionicora834@gmail.com pertenece a Mario Nicora → sintético
  { id_persona: 84,  nombre: "Roberto Zordan",            email: null,                                   cuentas: [{ id_cuenta: "0114", nombre_cuenta: "Roberto Zordan" }] },
  { id_persona: 85,  nombre: "Mario Nicora",              email: "marionicora834@gmail.com",             cuentas: [{ id_cuenta: "0115", nombre_cuenta: "Mario Nicora" }] },
  { id_persona: 86,  nombre: "Stella Maris Fiant",        email: "stellamarisfiant07@gmail.com",         cuentas: [{ id_cuenta: "0116", nombre_cuenta: "Stella Maris Fiant" }] },
  // ESI-0118 DARIO MUÑOZ: email dmunoz@sistemax.com.ar ya pertenece a Cesar Diaz (#16) → sintético
  { id_persona: 87,  nombre: "Dario Muñoz",               email: null,                                   cuentas: [{ id_cuenta: "0118", nombre_cuenta: "Dario Muñoz" }] },
  // ESI-0119 LOTE 51: email arielescobar (placeholder del instalador) → titular desconocido
  { id_persona: 88,  nombre: "Lote 51",                   email: null,                                   cuentas: [{ id_cuenta: "0119", nombre_cuenta: "Lote 51" }] },
  { id_persona: 89,  nombre: "Carlos Brassesco",          email: "carlosmbrassesco@hotmail.com",         cuentas: [{ id_cuenta: "0120", nombre_cuenta: "Carlos Brassesco" }] },
  { id_persona: 90,  nombre: "José Leotta",               email: "licjleotta@gmail.com",                 cuentas: [{ id_cuenta: "0121", nombre_cuenta: "Jose Leotta" }] },
  { id_persona: 91,  nombre: "Cima",                      email: null,                                   cuentas: [{ id_cuenta: "0123", nombre_cuenta: "Cima" }] },
  { id_persona: 92,  nombre: "Jimena Muñoz",              email: "jimenamunoz75@gmail.com",              cuentas: [{ id_cuenta: "0124", nombre_cuenta: "Jimena" }] },
  { id_persona: 93,  nombre: "Marcelo Cudini",            email: "marcelocudini@gmail.com",              cuentas: [{ id_cuenta: "0125", nombre_cuenta: "La Cañada" }] },
  { id_persona: 94,  nombre: "Alejandra Casanova",        email: "casanovaalejandra6@gmail.com",         cuentas: [{ id_cuenta: "0127", nombre_cuenta: "Casanova" }] },
  { id_persona: 95,  nombre: "Sembrando Victorias",       email: "info@sembrandovictorias.org",          cuentas: [{ id_cuenta: "0128", nombre_cuenta: "DSC" }] },
  { id_persona: 96,  nombre: "Juan La Syrene",            email: "juandosba@gmail.com",                  cuentas: [{ id_cuenta: "0129", nombre_cuenta: "La Syrene" }] },
  { id_persona: 97,  nombre: "Cristian Paisel",           email: "cristianpaisel@gmail.com",             cuentas: [{ id_cuenta: "0131", nombre_cuenta: "Cristian Paisel" }] },
  { id_persona: 98,  nombre: "Marcelo Chavez",            email: null,                                   cuentas: [{ id_cuenta: "0132", nombre_cuenta: "Marcelo Chavez" }] },
  // ESI-0135 DOMOTICA CBC: email arielescobar (placeholder) → titular desconocido
  { id_persona: 99,  nombre: "Domotica CBC",              email: null,                                   cuentas: [{ id_cuenta: "0135", nombre_cuenta: "Domotica CBC" }] },
  { id_persona: 100, nombre: "Diana Algaraña",            email: null,                                   cuentas: [{ id_cuenta: "0136", nombre_cuenta: "Diana Algaraña" }] },
  { id_persona: 101, nombre: "Atencio Campo Golf",        email: null,                                   cuentas: [{ id_cuenta: "0137", nombre_cuenta: "Atencio Campo Golf" }] },
  { id_persona: 102, nombre: "Gaston Giorgini",           email: null,                                   cuentas: [{ id_cuenta: "0138", nombre_cuenta: "Gaston Giorgini" }] },
  { id_persona: 103, nombre: "Agustin Calabresse",        email: null,                                   cuentas: [{ id_cuenta: "0140", nombre_cuenta: "Agustin Calabresse" }] },
  { id_persona: 104, nombre: "Silvia Parana",             email: null,                                   cuentas: [{ id_cuenta: "0141", nombre_cuenta: "Silvia Parana" }] },
  // ESI-0142 JULIO PRIMO: email arielescobar (placeholder) → titular desconocido
  { id_persona: 105, nombre: "Julio Primo",               email: null,                                   cuentas: [{ id_cuenta: "0142", nombre_cuenta: "Julio Primo" }] },
  { id_persona: 106, nombre: "Oscar",                     email: null,                                   cuentas: [{ id_cuenta: "0143", nombre_cuenta: "Oscar" }] },
  { id_persona: 107, nombre: "Planta de Reciclaje",       email: null,                                   cuentas: [{ id_cuenta: "0144", nombre_cuenta: "Planta de Reciclaje" }] },
  { id_persona: 108, nombre: "Green Servicio",            email: null,                                   cuentas: [{ id_cuenta: "0149", nombre_cuenta: "Green Servicio" }] },
  { id_persona: 109, nombre: "Julio Andres",              email: null,                                   cuentas: [{ id_cuenta: "0161", nombre_cuenta: "Julio Andres" }] },
  { id_persona: 110, nombre: "Jesus Emanuel Robledo",     email: null,                                   cuentas: [{ id_cuenta: "0163", nombre_cuenta: "Jesus Emanuel Robledo" }] },
  { id_persona: 111, nombre: "JC Construcciones",         email: null,                                   cuentas: [{ id_cuenta: "0165", nombre_cuenta: "JC Construcciones" }] },
  { id_persona: 112, nombre: "Tecno Vic",                 email: null,                                   cuentas: [{ id_cuenta: "0166", nombre_cuenta: "Tecno Vic" }] },
  { id_persona: 113, nombre: "Distribuidora Parque",      email: null,                                   cuentas: [{ id_cuenta: "0170", nombre_cuenta: "Distribuidora Parque" }] },
  { id_persona: 114, nombre: "Juan Francisco Casanova",   email: null,                                   cuentas: [{ id_cuenta: "0171", nombre_cuenta: "Juan Francisco Casanova" }] },
  { id_persona: 115, nombre: "Sofia Ellemberger",         email: null,                                   cuentas: [{ id_cuenta: "0172", nombre_cuenta: "Sofia Ellemberger" }] },
  { id_persona: 116, nombre: "Gabriel Bainotti",          email: null,                                   cuentas: [{ id_cuenta: "0173", nombre_cuenta: "Gabriel Bainotti" }] },
  { id_persona: 117, nombre: "Elba El Hostal",            email: null,                                   cuentas: [{ id_cuenta: "0174", nombre_cuenta: "Elba El Hostal de Victoria" }] },
  { id_persona: 118, nombre: "Agroquimicos Ruta 12",      email: null,                                   cuentas: [{ id_cuenta: "0175", nombre_cuenta: "Agroquímicos Ruta 12" }] },
  { id_persona: 119, nombre: "Juan Alberto Leiza",        email: null,                                   cuentas: [{ id_cuenta: "0176", nombre_cuenta: "Juan Alberto Leiza" }] },
  { id_persona: 120, nombre: "Pablo Beli",                email: null,                                   cuentas: [{ id_cuenta: "0177", nombre_cuenta: "Beli Pablo" }] },
  { id_persona: 121, nombre: "Ferretera Entre Rios",      email: null,                                   cuentas: [{ id_cuenta: "0178", nombre_cuenta: "Ferretera Entre Rios" }] },
  { id_persona: 122, nombre: "Sebastian Deusich",         email: null,                                   cuentas: [{ id_cuenta: "0179", nombre_cuenta: "Sebastian Deusich" }] },
  { id_persona: 123, nombre: "Juan Albornoz",             email: null,                                   cuentas: [{ id_cuenta: "0180", nombre_cuenta: "Juan Albornoz" }] },
  { id_persona: 124, nombre: "Silvia Boaglio",            email: null,                                   cuentas: [{ id_cuenta: "0182", nombre_cuenta: "Silvia Boaglio" }] },
  { id_persona: 125, nombre: "Inser Vetti",               email: null,                                   cuentas: [{ id_cuenta: "0184", nombre_cuenta: "Inser Vetti" }] },
  { id_persona: 126, nombre: "Martin Solar Vetti",        email: null,                                   cuentas: [{ id_cuenta: "0185", nombre_cuenta: "Martin Solar Vetti" }] },
  { id_persona: 127, nombre: "Francisco Otegui",          email: null,                                   cuentas: [{ id_cuenta: "0186", nombre_cuenta: "Francisco Otegui" }] },
  { id_persona: 128, nombre: "Andres Solar",              email: null,                                   cuentas: [{ id_cuenta: "0188", nombre_cuenta: "Dr. Andres Solar" }] },
  { id_persona: 129, nombre: "Sergio Ellemberger",        email: null,                                   cuentas: [{ id_cuenta: "0189", nombre_cuenta: "Sergio Ellemberger" }] },
  { id_persona: 130, nombre: "Silvio Pacher Solar",       email: null,                                   cuentas: [{ id_cuenta: "0190", nombre_cuenta: "Silvio Pacher Solar" }] },
  { id_persona: 131, nombre: "Domotica Los Algarrabos",   email: null,                                   cuentas: [{ id_cuenta: "0191", nombre_cuenta: "Domotica Los Algarrabos" }] },
  { id_persona: 132, nombre: "Hector Brassesco",          email: null,                                   cuentas: [{ id_cuenta: "0193", nombre_cuenta: "Hector Brassesco" }] },
  { id_persona: 133, nombre: "Repuestos Tato",            email: null,                                   cuentas: [{ id_cuenta: "0194", nombre_cuenta: "Repuestos Tato" }] },
  { id_persona: 134, nombre: "Pecan Hernandez",           email: null,                                   cuentas: [{ id_cuenta: "0195", nombre_cuenta: "Pecan Hernandez" }] },
  { id_persona: 135, nombre: "Hugo Ruffini",              email: null,                                   cuentas: [{ id_cuenta: "0196", nombre_cuenta: "Hugo Ruffini" }] },
  { id_persona: 136, nombre: "Ruben Faccendini",          email: null,                                   cuentas: [{ id_cuenta: "0197", nombre_cuenta: "Ruben Faccendini" }] },
  { id_persona: 137, nombre: "Oficina Ruka",              email: null,                                   cuentas: [{ id_cuenta: "0198", nombre_cuenta: "Oficina Ruka" }] },
  { id_persona: 138, nombre: "Lucio",                     email: null,                                   cuentas: [{ id_cuenta: "999B", nombre_cuenta: "Lucio" }] },
];

// ── Parsear XLS para obtener emails y teléfonos ───────────────────────────────

interface XlsRow {
  softguard_ref: string;  // "ESI-0001"
  email: string | null;
  telefono: string | null;
  localidad: string | null;
  calle: string | null;
  provincia: string | null;
  codigo_postal: string | null;
}

// ── Parser HTML-as-XLS (formato Softguard) ───────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseHtmlTable(html: string): Record<string, string>[] {
  // Extraer encabezados de <th>
  const headers = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)]
    .map(m => decodeHtmlEntities(m[1]));

  if (headers.length === 0) return [];

  // Extraer filas con <td>
  const rows: Record<string, string>[] = [];
  for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map(m => decodeHtmlEntities(m[1]));
    if (cells.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    rows.push(row);
  }
  return rows;
}

function parseXLS(): Map<string, XlsRow> {
  const map = new Map<string, XlsRow>();
  if (!fs.existsSync(XLS_PATH)) {
    console.warn(`⚠ XLS no encontrado en ${XLS_PATH} — se crearán usuarios sin email real`);
    return map;
  }

  const content = fs.readFileSync(XLS_PATH, "utf8");
  const isHtml = content.trimStart().startsWith("/***") || content.includes("<!DOCTYPE html>");

  let rows: Record<string, string>[];
  if (isHtml) {
    rows = parseHtmlTable(content);
  } else {
    const wb = read(Buffer.from(content), { type: "buffer", raw: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
  }

  for (const row of rows) {
    // Columna "Dealer/Cuenta" en el HTML tiene ese nombre exacto
    const ref = (row["Dealer/Cuenta"] ?? Object.entries(row).find(([k]) => k.toLowerCase().includes("dealer"))?.[1] ?? "")
      .trim().replace(/\s+/g, "");
    if (!ref) continue;

    map.set(ref, {
      softguard_ref: ref,
      email: row["Email"]?.trim() || null,
      telefono: row["Teléfono"]?.trim() || row["Telefono"]?.trim() || null,
      localidad: row["Localidad"]?.trim() || null,
      calle: row["Calle"]?.trim() || null,
      provincia: row["Provincia-Estado"]?.trim() || null,
      codigo_postal: row["Código postal"]?.trim() || row["Codigo postal"]?.trim() || null,
    });
  }

  return map;
}

// ── Normalizar teléfono ───────────────────────────────────────────────────────

function normTel(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits || null;
}

// ── Categoría según nombre de cuenta ─────────────────────────────────────────

function inferCategoria(nombre: string): "ALARMA_MONITOREO" | "DOMOTICA" | "CAMARA_CCTV" | "ANTENA_STARLINK" | "OTRO" {
  const n = nombre.toLowerCase();
  if (n.includes("starlink") || n.includes("antena")) return "ANTENA_STARLINK";
  if (n.includes("camara") || n.includes("cctv")) return "CAMARA_CCTV";
  if (n.includes("domotica") || n.includes("domótica")) return "DOMOTICA";
  return "ALARMA_MONITOREO";
}

// ── Log helpers ───────────────────────────────────────────────────────────────

const OK = (msg: string) => console.log(`  ✓ ${msg}`);
const SKIP = (msg: string) => console.log(`  → ${msg}`);
const ERR = (msg: string) => console.error(`  ✗ ${msg}`);
const DRY = (msg: string) => console.log(`  [DRY] ${msg}`);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Importación de clientes a Supabase`);
  console.log(`  Modo: ${DRY_RUN ? "DRY RUN (sin cambios)" : "APLICANDO CAMBIOS REALES"}`);
  console.log(`${"═".repeat(60)}\n`);

  // 1. Parsear XLS
  console.log("📋 Leyendo XLS de Softguard...");
  const xlsData = parseXLS();
  console.log(`   ${xlsData.size} filas encontradas en XLS\n`);

  // 2. Construir índice: id_cuenta → email/telefono del XLS
  // Para cada persona_juridica, buscamos el email de cualquiera de sus cuentas
  const emailPorPersona = new Map<number, string | null>();
  const telPorPersona = new Map<number, string | null>();
  const xlsDirPorCuenta = new Map<string, XlsRow>();

  for (const cuenta of CUENTAS_LOCAL) {
    const esiRef = `ESI-${cuenta.id_cuenta}`;
    const xls = xlsData.get(esiRef);
    if (xls) {
      xlsDirPorCuenta.set(cuenta.id_cuenta, xls);
      if (xls.email && !emailPorPersona.get(cuenta.id_persona_juridica)) {
        emailPorPersona.set(cuenta.id_persona_juridica, xls.email);
      }
      if (xls.telefono && !telPorPersona.get(cuenta.id_persona_juridica)) {
        telPorPersona.set(cuenta.id_persona_juridica, xls.telefono);
      }
    }
  }

  // 3. Importar personas_juridicas → Perfil + Supabase Auth user
  console.log("👤 Importando personas (Perfiles)...\n");

  const perfilIdPorPersona = new Map<number, string>(); // id_persona → UUID en Supabase

  for (const persona of PERSONAS) {
    const nombre = persona.nombre_razon_social;
    const emailReal = emailPorPersona.get(persona.id_persona) ?? null;
    const telefono = normTel(telPorPersona.get(persona.id_persona) ?? null);

    // Email definitivo: real si existe, sintético si no
    const emailAuth = emailReal ?? `cliente.${persona.id_persona}@escobar-instalaciones.local`;
    const esSintetico = !emailReal;

    console.log(`  Persona #${persona.id_persona}: ${nombre}`);
    console.log(`    Email: ${emailAuth}${esSintetico ? " (sintético)" : ""}`);

    // Verificar si ya existe un perfil con ese email
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const yaExiste = existingUser?.users?.find(u => u.email === emailAuth);

    if (yaExiste) {
      SKIP(`Ya existe en Supabase Auth (${yaExiste.id})`);
      perfilIdPorPersona.set(persona.id_persona, yaExiste.id);

      // Verificar si ya existe el Perfil en Prisma
      const perfilExistente = await prisma.perfil.findUnique({ where: { id: yaExiste.id } });
      if (!perfilExistente) {
        if (!DRY_RUN) {
          const crearPerfil = async (tel: string | null) =>
            prisma.perfil.create({
              data: {
                id: yaExiste.id,
                nombre,
                email: emailReal ?? undefined,
                telefono: tel ?? undefined,
                rol: "CLIENTE",
                activo: true,
                fecha_alta_softguard: persona.fecha_alta,
              },
            });
          try {
            await crearPerfil(telefono);
            OK("Perfil creado en Prisma (auth ya existía)");
          } catch (err: unknown) {
            const isUniqueErr = err instanceof Error && err.message.includes("Unique constraint");
            if (isUniqueErr && telefono) {
              await crearPerfil(null);
              OK(`Perfil creado sin teléfono (${telefono} duplicado)`);
            } else {
              ERR(`Error al crear Perfil: ${err instanceof Error ? err.message : err}`);
            }
          }
        } else {
          DRY("Crearía Perfil en Prisma");
        }
      } else {
        SKIP("Perfil ya existe en Prisma");
      }
      console.log();
      continue;
    }

    // Crear en Supabase Auth
    if (!DRY_RUN) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailAuth,
        email_confirm: true,
        user_metadata: { nombre },
        // Sin password — el cliente inicia sesión via WhatsApp OTP o link mágico
      });

      if (authError || !authData?.user) {
        ERR(`Error al crear en Supabase Auth: ${authError?.message}`);
        console.log();
        continue;
      }

      const userId = authData.user.id;
      perfilIdPorPersona.set(persona.id_persona, userId);
      OK(`Creado en Supabase Auth (${userId})`);

      // Crear Perfil en Prisma (con fallback si el teléfono colisiona)
      try {
        await prisma.perfil.create({
          data: {
            id: userId,
            nombre,
            email: emailReal ?? undefined,
            telefono: telefono ?? undefined,
            rol: "CLIENTE",
            activo: true,
            fecha_alta_softguard: persona.fecha_alta,
          },
        });
        OK("Perfil creado en Prisma");
      } catch (err: unknown) {
        const isUniqueErr = err instanceof Error && err.message.includes("Unique constraint");
        if (isUniqueErr && telefono) {
          // Reintentar sin teléfono
          await prisma.perfil.create({
            data: {
              id: userId,
              nombre,
              email: emailReal ?? undefined,
              telefono: undefined,
              rol: "CLIENTE",
              activo: true,
              fecha_alta_softguard: persona.fecha_alta,
            },
          });
          OK(`Perfil creado en Prisma (teléfono ${telefono} duplicado — omitido)`);
        } else {
          ERR(`Error al crear Perfil: ${err instanceof Error ? err.message : err}`);
        }
      }
    } else {
      DRY(`Crearía usuario en Supabase Auth → email: ${emailAuth}`);
      DRY(`Crearía Perfil: nombre="${nombre}", telefono=${telefono ?? "null"}`);
      perfilIdPorPersona.set(persona.id_persona, `[UUID-${persona.id_persona}]`);
    }

    console.log();
  }

  // 4. Importar cuentas (BD local + vinculadas a perfiles existentes)
  console.log("\n🏠 Importando cuentas...\n");

  let cuentasCreadas = 0;
  let cuentasOmitidas = 0;
  let cuentasError = 0;

  // Helper reutilizable
  async function importarCuenta(idCuenta: string, nombreCuenta: string, perfilId: string) {
    const softguard_ref = `ESI-${idCuenta}`;
    const xlsRow = xlsData.get(softguard_ref);

    const existente = await prisma.cuenta.findUnique({ where: { softguard_ref } });
    if (existente) {
      SKIP(`${softguard_ref} ya existe → ${nombreCuenta}`);
      cuentasOmitidas++;
      return;
    }

    if (!DRY_RUN) {
      try {
        await prisma.cuenta.create({
          data: {
            softguard_ref,
            perfil_id: perfilId,
            descripcion: nombreCuenta,
            categoria: inferCategoria(nombreCuenta),
            estado: "ACTIVA",
            costo_mensual: 15000,
            calle: xlsRow?.calle || undefined,
            localidad: xlsRow?.localidad || undefined,
            provincia: xlsRow?.provincia || "Entre Ríos",
            codigo_postal: xlsRow?.codigo_postal || undefined,
          },
        });
        OK(`${softguard_ref} → ${nombreCuenta}`);
        cuentasCreadas++;
      } catch (err) {
        ERR(`${softguard_ref}: ${err instanceof Error ? err.message : err}`);
        cuentasError++;
      }
    } else {
      DRY(`Crearía Cuenta ${softguard_ref} → "${nombreCuenta}" (perfil: ${perfilId})`);
      cuentasCreadas++;
    }
  }

  for (const c of CUENTAS_LOCAL) {
    const perfil_id = perfilIdPorPersona.get(c.id_persona_juridica);
    if (!perfil_id) {
      ERR(`Sin perfil_id para persona #${c.id_persona_juridica} (ESI-${c.id_cuenta})`);
      cuentasError++;
      continue;
    }
    await importarCuenta(c.id_cuenta, c.nombre_cuenta, perfil_id);
  }

  // Cuentas vinculadas a perfiles ya existentes (identificadas por email/apellido/patrón)
  console.log("\n🔗 Vinculando cuentas a perfiles existentes...\n");
  for (const c of CUENTAS_VINCULADAS_EXISTENTES) {
    const perfil_id = perfilIdPorPersona.get(c.id_persona_juridica);
    if (!perfil_id) {
      ERR(`Sin perfil_id para persona #${c.id_persona_juridica} (ESI-${c.id_cuenta})`);
      cuentasError++;
      continue;
    }
    await importarCuenta(c.id_cuenta, c.nombre_cuenta, perfil_id);
  }

  // 5. Personas huérfanas → crear Auth + Perfil + sus cuentas
  console.log("\n👤 Importando personas huérfanas...\n");

  let huerfanasCreadas = 0;

  async function crearPerfilConFallback(userId: string, nombre: string, emailReal: string | null, telefono: string | null) {
    const crear = (tel: string | null) =>
      prisma.perfil.create({
        data: { id: userId, nombre, email: emailReal ?? undefined, telefono: tel ?? undefined,
                rol: "CLIENTE", activo: true },
      });
    try {
      await crear(telefono);
    } catch (err: unknown) {
      const isUnique = err instanceof Error && err.message.includes("Unique constraint");
      if (isUnique && telefono) {
        await crear(null);
        OK(`Perfil creado sin teléfono (${telefono} duplicado)`);
      } else {
        throw err;
      }
    }
  }

  for (const persona of PERSONAS_HUERFANAS) {
    const nombre = persona.nombre;
    const emailReal = persona.email;
    const emailAuth = emailReal ?? `cliente.${persona.id_persona}@escobar-instalaciones.local`;
    const esSintetico = !emailReal;

    // Buscar teléfono desde XLS (primera cuenta con tel)
    let telefono: string | null = null;
    for (const c of persona.cuentas) {
      const xls = xlsData.get(`ESI-${c.id_cuenta}`);
      if (xls?.telefono) { telefono = normTel(xls.telefono); break; }
    }

    console.log(`  Persona #${persona.id_persona}: ${nombre}`);
    console.log(`    Email: ${emailAuth}${esSintetico ? " (sintético)" : ""}`);

    // Verificar existencia
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const yaExiste = existingUser?.users?.find(u => u.email === emailAuth);

    let userId: string;

    if (yaExiste) {
      SKIP(`Ya existe en Supabase Auth (${yaExiste.id})`);
      userId = yaExiste.id;
      perfilIdPorPersona.set(persona.id_persona, userId);

      const perfilExistente = await prisma.perfil.findUnique({ where: { id: userId } });
      if (!perfilExistente) {
        if (!DRY_RUN) {
          try {
            await crearPerfilConFallback(userId, nombre, emailReal, telefono);
            OK("Perfil creado en Prisma (auth ya existía)");
          } catch (err) {
            ERR(`Error Perfil: ${err instanceof Error ? err.message : err}`);
            console.log(); continue;
          }
        } else {
          DRY("Crearía Perfil en Prisma");
        }
      } else {
        SKIP("Perfil ya existe en Prisma");
      }
    } else if (!DRY_RUN) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailAuth, email_confirm: true, user_metadata: { nombre },
      });
      if (authError || !authData?.user) {
        ERR(`Error Supabase Auth: ${authError?.message}`);
        console.log(); continue;
      }
      userId = authData.user.id;
      perfilIdPorPersona.set(persona.id_persona, userId);
      OK(`Creado en Supabase Auth (${userId})`);

      try {
        await crearPerfilConFallback(userId, nombre, emailReal, telefono);
        OK("Perfil creado en Prisma");
      } catch (err) {
        ERR(`Error Perfil: ${err instanceof Error ? err.message : err}`);
        console.log(); continue;
      }
      huerfanasCreadas++;
    } else {
      DRY(`Crearía usuario en Supabase Auth → email: ${emailAuth}`);
      DRY(`Crearía Perfil: nombre="${nombre}", telefono=${telefono ?? "null"}`);
      userId = `[UUID-${persona.id_persona}]`;
      perfilIdPorPersona.set(persona.id_persona, userId);
      huerfanasCreadas++;
    }

    // Cuentas de esta persona huérfana
    for (const c of persona.cuentas) {
      await importarCuenta(c.id_cuenta, c.nombre_cuenta, userId);
    }
    console.log();
  }

  // 6. Resumen
  console.log(`\n${"═".repeat(60)}`);
  console.log("  RESUMEN");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Personas BD local    : ${PERSONAS.length}`);
  console.log(`  Personas huérfanas   : ${PERSONAS_HUERFANAS.length} (${huerfanasCreadas} nuevas)`);
  console.log(`  Cuentas vinculadas   : ${CUENTAS_VINCULADAS_EXISTENTES.length}`);
  console.log(`  Cuentas creadas      : ${cuentasCreadas}`);
  console.log(`  Cuentas omitidas     : ${cuentasOmitidas} (ya existían)`);
  console.log(`  Cuentas con error    : ${cuentasError}`);
  if (DRY_RUN) {
    console.log(`\n  ⚠ DRY RUN — ningún cambio fue aplicado.`);
    console.log(`  Para aplicar: npx tsx scripts/import-clientes.ts --apply`);
  }
  console.log();

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error fatal:", err);
  prisma.$disconnect();
  process.exit(1);
});

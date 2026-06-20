/**
 * Sonda de descubrimiento: busca el endpoint de CONTACTOS de una cuenta en la API web
 * de SoftGuard. Alimenta la Feature 1 del módulo de notificación WhatsApp (poder
 * seleccionar otros contactos de la misma cuenta). Mismo flujo de login que web-api.
 *
 * SOLO LECTURA. Correr desde una cuenta con VARIOS contactos cargados.
 *
 * Uso:
 *   node --env-file=.env.local scripts/sg-probe-contactos.mjs <iidCuenta> [ncuenta]
 *     <iidCuenta>  id interno de la cuenta (rec_iidcuenta / cue_iidcuenta), ej: 175
 *     [ncuenta]    opcional, número de cuenta (cue_ncuenta), ej: 0175
 *
 * Para cada endpoint candidato imprime HTTP/total/rows, las CLAVES del primer row y un
 * sample. Buscá el que devuelva filas con nombre + teléfono: con esas claves se ajusta
 * `fetchContactosCuenta` en src/lib/softguard/api/crm.ts y se prende el flag de la route.
 */

const BASE = (process.env.SOFTGUARD_API_BASE || "").replace(/\/$/, "");
const USER = process.env.SOFTGUARD_API_USER || "";
const PASS = process.env.SOFTGUARD_API_PASS || "";
const CLIENT_ID = process.env.SOFTGUARD_API_CLIENT_ID || "";

if (!BASE || !USER || !PASS) {
  console.error("Faltan SOFTGUARD_API_* en .env.local");
  process.exit(1);
}

const IID = process.argv[2] || "175";
const NCUENTA = process.argv[3] || "";

const cookies = {};
const cookieHeader = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");

function absorb(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

// Login (mismo flujo que core.ts / web-api.ts)
absorb(await fetch(`${BASE}/`, { redirect: "manual" }));
const login = await fetch(`${BASE}/OAuthLogin.ashx`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader() },
  body: new URLSearchParams({ username: USER, password: PASS, ClientId: CLIENT_ID, cDealer: "" }),
  redirect: "manual",
});
absorb(login);
const loc = login.headers.get("location") ?? "";
if (!loc) { console.error("login sin redirect — credenciales inválidas o reCAPTCHA"); process.exit(1); }
absorb(await fetch(loc.startsWith("http") ? loc : `${BASE}${loc}`, { headers: { Cookie: cookieHeader() }, redirect: "manual" }));
console.log("login ok, OAuth_Token:", Boolean(cookies.OAuth_Token), "· cuenta iid:", IID, NCUENTA ? `ncuenta: ${NCUENTA}` : "");

async function probe(path, params = {}) {
  const qs = new URLSearchParams({ _dc: String(Date.now()), page: "1", start: "0", limit: "50", ...params });
  const etiqueta = `${path} ${JSON.stringify(params)}`;
  try {
    const res = await fetch(`${BASE}${path}?${qs}`, {
      headers: { Cookie: cookieHeader(), "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      console.log(`\n✗ ${etiqueta} → HTTP ${res.status} (${ct.split(";")[0] || "?"}) — no JSON`);
      return;
    }
    const j = await res.json();
    const rows = j.rows ?? j.data ?? [];
    console.log(`\n✓ ${etiqueta} → HTTP ${res.status} success=${j.success} total=${j.total} rows=${rows.length}`);
    if (rows.length > 0) {
      console.log("  claves:", Object.keys(rows[0]).join(", "));
      console.log("  sample:", JSON.stringify(rows[0]).slice(0, 700));
    }
  } catch (e) {
    console.log(`\n✗ ${etiqueta} → ERROR ${e.message}`);
  }
}

// Endpoints candidatos para "contactos / lista de llamados" de una cuenta en SoftGuard.
// Se prueban sin filtro (¿existe?) y con los filtros de cuenta más probables.
const PATHS = ["/Rest/Search/Telefonos"];

const FILTROS = [
  {}, // sin filtro: total global
  { filter: JSON.stringify([{ property: "tel_iidcuenta", value: Number(IID) }]) },
  { filter: JSON.stringify([{ property: "tel_iidcuenta", operator: "eq", value: Number(IID) }]) },
];

for (const path of PATHS) {
  // primero sin filtro; si no existe (no JSON), no insistir con filtros
  const before = JSON.stringify(cookies);
  await probe(path, {});
  void before;
  for (const f of FILTROS.slice(1)) await probe(path, f);
}

console.log("\nListo. Anotá el path + las claves del row que traiga nombre y teléfono.");

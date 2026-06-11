/**
 * Sonda de EventoTimeLineFull: descubre cómo se filtra el histórico de
 * eventos POR CUENTA (requisito de la Fase 4 — /portal/eventos del cliente).
 *
 * Prueba las variantes de filtrado típicas de la suite (params directos,
 * filter ExtJS con y sin alias) y reporta cuál devuelve filas filtradas:
 * comparar el `total` de cada variante contra la consulta sin filtro.
 *
 * ⚠ CORRER CON LA APP APAGADA (sin `npm run dev` ni cron activo): los logins
 * concurrentes del mismo usuario web se pisan el handshake OAuth.
 *
 * Uso: node --env-file=.env.local scripts/sg-probe-timeline.mjs [cuenta] [linea]
 *      (default: cuenta 0175, línea ESI)
 */

const CUENTA = process.argv[2] || "0175";
const LINEA  = process.argv[3] || "ESI";

const BASE = (process.env.SOFTGUARD_API_BASE || "").replace(/\/$/, "");
const USER = process.env.SOFTGUARD_API_USER || "";
const PASS = process.env.SOFTGUARD_API_PASS || "";
const CLIENT_ID = process.env.SOFTGUARD_API_CLIENT_ID || "";

if (!BASE || !USER || !PASS) {
  console.error("Faltan SOFTGUARD_API_* en .env.local");
  process.exit(1);
}

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

// Login (mismo flujo que api/core.ts)
absorb(await fetch(`${BASE}/`, { redirect: "manual" }));
const login = await fetch(`${BASE}/OAuthLogin.ashx`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader() },
  body: new URLSearchParams({ username: USER, password: PASS, ClientId: CLIENT_ID, cDealer: "" }),
  redirect: "manual",
});
absorb(login);
const loc = login.headers.get("location") ?? "";
if (!loc) { console.error("login sin redirect"); process.exit(1); }
absorb(await fetch(loc.startsWith("http") ? loc : `${BASE}${loc}`, { headers: { Cookie: cookieHeader() }, redirect: "manual" }));
console.log("login ok, OAuth_Token:", Boolean(cookies.OAuth_Token));
console.log(`sondeando EventoTimeLineFull para cuenta=${CUENTA} linea=${LINEA}\n`);

async function probe(nombre, params = {}) {
  const qs = new URLSearchParams({ _dc: String(Date.now()), page: "1", start: "0", limit: "10", ...params });
  try {
    const res = await fetch(`${BASE}/Rest/search/EventoTimeLineFull?${qs}`, {
      headers: { Cookie: cookieHeader(), "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      console.log(`${nombre} → HTTP ${res.status} (${ct.split(";")[0]}) — no JSON`);
      return;
    }
    const j = await res.json();
    const rows = j.rows ?? j.data ?? [];
    console.log(`${nombre} → HTTP ${res.status} success=${j.success} total=${j.total} rows=${rows.length}`);
    if (rows.length > 0) {
      console.log("  sample:", JSON.stringify(rows[0]).slice(0, 500));
      const cuentasVistas = [...new Set(rows.map((r) => r.cue_ncuenta?.trim?.() ?? "?"))];
      console.log("  cuentas en la página:", cuentasVistas.join(", "));
    }
    console.log("");
  } catch (e) {
    console.log(`${nombre} → ERROR ${e.message}\n`);
  }
}

// Línea base: sin filtro (para comparar totales).
await probe("sin filtro          ");

// Variantes de filtrado por cuenta a descubrir:
await probe("params directos     ", { cue_ncuenta: CUENTA, cue_clinea: LINEA });
await probe("filter cue_ncuenta  ", { filter: JSON.stringify([{ property: "cue_ncuenta", value: CUENTA }]) });
await probe("filter c.cue_ncuenta", { filter: JSON.stringify([{ property: "c.cue_ncuenta", value: CUENTA }]) });
await probe("filter + linea      ", {
  filter: JSON.stringify([
    { property: "cue_ncuenta", value: CUENTA },
    { property: "cue_clinea", value: LINEA },
  ]),
});
await probe("estilo HistoricoMM  ", {
  cue_clinea: LINEA, cue_ncuenta: CUENTA,
  Origenes: "", Estados: "", Tipos: "", Prioridad: "",
  Operador: "", OperadorNot: "",
  FechaDesde: "", FechaHasta: "",
  Mostrar: "10", short: "1", extramonth: "false",
});

console.log("Listo. La variante cuyo total baja y cuyas filas son SOLO de la cuenta sondeada es el filtro real.");

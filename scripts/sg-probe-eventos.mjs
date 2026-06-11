/**
 * Sonda de diagnóstico: compara qué devuelven los endpoints de eventos de la
 * API web de SoftGuard (pendientes vs histórico) para elegir la fuente del
 * panel de multimonitoreo.
 *
 * Uso: node --env-file=.env.local scripts/sg-probe-eventos.mjs
 */

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

// Login (mismo flujo que web-api.ts)
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

async function probe(path, params = {}) {
  const qs = new URLSearchParams({ _dc: String(Date.now()), page: "1", start: "0", limit: "25", ...params });
  try {
    const res = await fetch(`${BASE}${path}?${qs}`, {
      headers: { Cookie: cookieHeader(), "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      console.log(`\n${path} → HTTP ${res.status} (${ct.split(";")[0]}) — no JSON`);
      return;
    }
    const j = await res.json();
    const rows = j.rows ?? j.data ?? [];
    console.log(`\n${path} → HTTP ${res.status} success=${j.success} total=${j.total} rows=${rows.length}`);
    if (rows.length > 0) console.log("  sample:", JSON.stringify(rows[0]).slice(0, 600));
  } catch (e) {
    console.log(`\n${path} → ERROR ${e.message}`);
  }
}

await probe("/rest/search/LinesByUser");
await probe("/Rest/search/EventosPendientes");
// Parámetros exactos capturados de la grilla del MultiMonitor Web (sg-capture)
await probe("/Rest/Search/ReporteHistoricoMM", {
  cod_nMultiMonitor: "1",
  Origenes: "", Estados: "", Tipos: "", short: "1",
  cue_clinea: "", Prioridad: "", cue_ncuenta: "",
  Operador: "", OperadorNot: "", Mostrar: "50",
  FechaDesde: "", FechaHasta: "", cod_cgrupoExcluir: "",
  extramonth: "false",
  sort: '[{"property":"r.rec_tfechahora","direction":"DESC"}]',
});
await probe("/Rest/search/EventoTimeLineFull");

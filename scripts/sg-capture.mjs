/**
 * Captura/diagnóstico de la API de la suite web de SoftGuard.
 * Entra con las credenciales de SOFTGUARD_API_* (.env.local), abre el módulo
 * indicado en el Desktop y registra los XHR/fetch para inspeccionar el shape
 * real de sus endpoints REST.
 *
 * Uso:  node --env-file=.env.local scripts/sg-capture.mjs [módulo]
 *       (default: "MultiMonitor Web"; ej.: ... sg-capture.mjs CRM)
 * Salida: scripts/.sg-capture.json (gitignored)
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE = (process.env.SOFTGUARD_API_BASE || "").replace(/\/$/, "");
const USER = process.env.SOFTGUARD_API_USER || "";
const PASS = process.env.SOFTGUARD_API_PASS || "";
if (!BASE || !USER || !PASS) {
  console.error("Faltan SOFTGUARD_API_BASE / USER / PASS. Corré con: node --env-file=.env.local scripts/sg-capture.mjs");
  process.exit(1);
}

const calls = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

// Listeners a nivel de CONTEXTO: capturan también los módulos que abren popup
// (ej. SerTec), no solo la página principal del Desktop.
context.on("request", (req) => {
  const t = req.resourceType();
  if (t === "xhr" || t === "fetch") calls.push({ method: req.method(), url: req.url() });
});
context.on("response", async (res) => {
  const t = res.request().resourceType();
  if ((t === "xhr" || t === "fetch") && (res.headers()["content-type"] || "").includes("json")) {
    const c = calls.find((x) => x.url === res.url() && !x.status);
    if (!c) return;
    c.status = res.status();
    try {
      const j = await res.json();
      c.sample = JSON.stringify(j).slice(0, 1500);
      if (typeof j.total === "number" && j.total > 0) {
        console.log(`  ✓ DATOS: ${res.url().replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "")} → total=${j.total}`);
      }
    } catch { /* ignore */ }
  }
});

try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click("#submitBtn");
  await page.waitForURL(/apps\/Desktop/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(8000);
  const modulo = process.argv[2] || "MultiMonitor Web";
  console.log(`abriendo módulo: ${modulo}`);
  await page.locator(`text=${modulo}`).first().dblclick({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(30000);
} catch (e) {
  console.log("ERROR:", e.message);
}

const uniq = {};
for (const c of calls) { const k = c.method + " " + c.url.replace(/\?.*$/, ""); if (!uniq[k]) uniq[k] = c; }
writeFileSync("scripts/.sg-capture.json", JSON.stringify(Object.values(uniq), null, 2));
console.log(`\n→ ${Object.keys(uniq).length} endpoints únicos. Guardado en scripts/.sg-capture.json`);
await browser.close();

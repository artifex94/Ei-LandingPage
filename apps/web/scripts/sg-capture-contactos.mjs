/**
 * Captura SOLO LECTURA del endpoint de CONTACTOS del CRM de SoftGuard.
 *
 * Navega (sin editar nada): CRM → seleccionar organización → "Información de la
 * organización" → área "Cuentas" → sección "Contactos", grabando el XHR para
 * descubrir el path/params/campos reales de los contactos.
 *
 * Uso:  node --env-file=.env.local scripts/sg-capture-contactos.mjs ["Módulo CRM"]
 * Salida: scripts/.sg-capture.json  +  scripts/.sg-step-*.png (screenshots por paso)
 *
 * NO toca datos en la central: solo navega y lee. No clickear botones de guardar/editar.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE = (process.env.SOFTGUARD_API_BASE || "").replace(/\/$/, "");
const USER = process.env.SOFTGUARD_API_USER || "";
const PASS = process.env.SOFTGUARD_API_PASS || "";
if (!BASE || !USER || !PASS) {
  console.error("Faltan SOFTGUARD_API_* en .env.local");
  process.exit(1);
}
const MODULO = process.argv[2] || "CRM";

const calls = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 768 } });
const page = await context.newPage();

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
      c.sample = JSON.stringify(j).slice(0, 3000);
      if (typeof j.total === "number" && j.total > 0) {
        const path = res.url().replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "");
        console.log(`  ✓ DATOS: ${path} → total=${j.total}`);
      }
    } catch { /* ignore */ }
  }
});

let step = 0;
async function shot(label) {
  step++;
  const file = `scripts/.sg-step-${String(step).padStart(2, "0")}.png`;
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  console.log(`paso ${step}: ${label} → ${file}`);
}
async function clickText(label, { dbl = false } = {}) {
  try {
    const loc = page.locator(`text=${label}`).first();
    await loc.waitFor({ state: "visible", timeout: 8000 });
    if (dbl) await loc.dblclick({ timeout: 5000 });
    else await loc.click({ timeout: 5000 });
    console.log(`   click ${dbl ? "(dbl) " : ""}"${label}" ✓`);
    return true;
  } catch (e) {
    console.log(`   click "${label}" ✗ (${e.message.split("\n")[0]})`);
    return false;
  }
}

try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click("#submitBtn");
  await page.waitForURL(/apps\/Desktop/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(8000);

  // Sesión concurrente: SoftGuard muestra "SE HA DETECTADO UNA SESIÓN INICIADA" con un
  // botón verde para tomar la sesión. La clickeamos para continuar al Desktop.
  const concurrente = await page.getByText(/SESI[ÓO]N INICIADA/i).first().isVisible().catch(() => false);
  if (concurrente) {
    console.log("   sesión concurrente detectada → intentando tomar la sesión");
    const btns = await page.locator("a, button, .x-btn, div[role=button]").allInnerTexts().catch(() => []);
    console.log("   botones visibles:", btns.map((t) => t.trim()).filter((t) => t && t.length < 40).slice(0, 25).join(" | "));
    let ok = false;
    for (const t of ["Ingresar", "Continuar", "Aceptar", "Iniciar", "Tomar", "Sí", "SI", "Continuar de todas formas"]) {
      ok = await clickText(t);
      if (ok) break;
    }
    await page.waitForTimeout(6000);
    await shot("tras tomar la sesión concurrente");
  }

  await shot("desktop tras login (acá se ven los nombres de los módulos)");

  console.log(`abriendo módulo: ${MODULO}`);
  await clickText(MODULO, { dbl: true });
  await page.waitForTimeout(6000);
  await shot("módulo CRM abierto (grilla de organizaciones)");

  // El contenido del CRM vive en un IFRAME (apps/SgWebCrm). Cada fila de la grilla es una
  // ORGANIZACIÓN: hay que ENTRAR (doble-click) para ver Cuentas → Contactos adentro.
  const crmFrame = () =>
    page.frames().find((f) => /apps\/SgWebCrm/i.test(f.url())) ||
    page.frames().find((f) => /SgWebCrm/i.test(f.url())) ||
    page.mainFrame();
  const clickIn = async (label, dbl = false) => {
    try {
      const loc = crmFrame().locator(`text=${label}`).first();
      await loc.waitFor({ state: "visible", timeout: 8000 });
      await (dbl ? loc.dblclick({ timeout: 5000 }) : loc.click({ timeout: 5000 }));
      console.log(`   click ${dbl ? "(dbl) " : ""}"${label}" ✓`);
      return true;
    } catch (e) { console.log(`   click "${label}" ✗ (${e.message.split("\n")[0]})`); return false; }
  };

  console.log("CRM frame:", crmFrame().url().slice(0, 70));
  // Entrar a la primera organización (doble-click en la primera fila de la grilla, en el iframe).
  try {
    await crmFrame().locator(".x-grid-row, .x-grid-item, tr.x-grid-data-row, .x-grid-cell").first().dblclick({ timeout: 8000 });
    console.log("   doble-click primera organización ✓");
  } catch (e) { console.log(`   dblclick fila ✗ (${e.message.split("\n")[0]})`); }
  await page.waitForTimeout(3500);
  await shot("tras entrar a la organización");

  await clickIn("Información de la organización");
  await page.waitForTimeout(2500);
  await shot("Información de la organización");

  await clickIn("Cuentas");
  await page.waitForTimeout(3000);
  await shot("Cuentas");

  await clickIn("Contactos");
  await page.waitForTimeout(4500);
  await shot("Contactos (deberia disparar el XHR de contactos)");
  await page.waitForTimeout(3000);
} catch (e) {
  console.log("ERROR:", e.message);
}

const uniq = {};
for (const c of calls) { const k = c.method + " " + c.url.replace(/\?.*$/, ""); if (!uniq[k]) uniq[k] = c; }
writeFileSync("scripts/.sg-capture.json", JSON.stringify(Object.values(uniq), null, 2));
console.log(`\n→ ${Object.keys(uniq).length} endpoints únicos en scripts/.sg-capture.json. Revisá los .sg-step-*.png`);
await browser.close();

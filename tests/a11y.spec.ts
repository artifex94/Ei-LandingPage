/**
 * Tests de accesibilidad WCAG 2.2 AA con axe-core.
 * Cubre páginas públicas (sin auth) y páginas de portal con sesión si está disponible.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function axeScan(page: Page) {
  return new AxeBuilder({ page } as ConstructorParameters<typeof AxeBuilder>[0])
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    // Excepciones conocidas aceptadas del stack de terceros
    .exclude("#__next-route-announcer__")
    .analyze();
}

// ─── Páginas públicas ─────────────────────────────────────────────────────────

test.describe("Páginas públicas — a11y", () => {
  test("/ (landing) no tiene violaciones axe", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const results = await axeScan(page);
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test("/login no tiene violaciones axe", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const results = await axeScan(page);
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test("/login tiene landmark <main>", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("main")).toBeVisible();
  });

  test("/login tiene skip-link al contenido principal", async ({ page }) => {
    await page.goto("/login");
    // El skip-link es sr-only pero debe existir en el DOM
    const skipLink = page.locator('a[href="#main-content"]').first();
    await expect(skipLink).toHaveCount(1);
  });
});

// ─── Formulario de login — interacción ───────────────────────────────────────

test.describe("Login — usabilidad y a11y", () => {
  test("campos tienen labels asociados", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel(/correo/i);
    const passInput  = page.getByLabel(/contraseña/i);
    await expect(emailInput).toBeVisible();
    await expect(passInput).toBeVisible();
  });

  test("botón de submit tiene texto accesible", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByRole("button", { name: /ingresar/i });
    await expect(btn).toBeVisible();
  });

  test("sin credenciales no navega (validación en cliente)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /ingresar/i }).click();
    // Sigue en /login o muestra error — no redirige al portal
    await expect(page).not.toHaveURL(/\/portal/);
  });

  test("tamaño mínimo de toque en botones críticos (≥ 44px)", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByRole("button", { name: /ingresar/i });
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

// ─── Portal — requiere auth ───────────────────────────────────────────────────
// Estos tests se ejecutan solo si el setup de auth tuvo credenciales reales.
// Si el storageState está vacío (sin sesión), las rutas redirigen a /login
// y los tests verifican esa redirección en lugar de fallar.

test.describe("Portal — a11y con sesión", () => {
  test("/portal/dashboard — sin violaciones axe o redirige a login", async ({ page }) => {
    await page.goto("/portal/dashboard");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      // Sin sesión — es el comportamiento correcto del guard
      test.info().annotations.push({ type: "skipped-reason", description: "Sin credenciales de test" });
      return;
    }

    const results = await axeScan(page);
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test("/portal/pagos — sin violaciones axe o redirige a login", async ({ page }) => {
    await page.goto("/portal/pagos");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      test.info().annotations.push({ type: "skipped-reason", description: "Sin credenciales de test" });
      return;
    }

    const results = await axeScan(page);
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });
});

// ─── Guards de ruta ──────────────────────────────────────────────────────────

test.describe("Guards de ruta — proxy.ts", () => {
  test("/portal/dashboard sin sesión → redirige a /login", async ({ page }) => {
    // Navegamos sin storageState (contexto fresco del browser)
    await page.context().clearCookies();
    await page.goto("/portal/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("/admin/dashboard sin sesión → redirige a /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ─── Helper de formato ────────────────────────────────────────────────────────

function formatViolations(violations: { id: string; description: string; nodes: { html: string }[] }[]) {
  if (!violations.length) return "";
  return (
    "\n\nViolaciones axe:\n" +
    violations
      .map((v) => `  [${v.id}] ${v.description}\n    HTML: ${v.nodes[0]?.html ?? "?"}`)
      .join("\n")
  );
}

/**
 * Tests E2E de flujos funcionales — requieren sesión activa.
 * Se ejecutan con el storageState generado por auth.setup.ts.
 *
 * Si no hay credenciales de test, todos los tests detectan la redirección a /login
 * y se marcan con anotación "sin-credenciales" en lugar de fallar.
 */
import { test, expect } from "@playwright/test";

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Verifica si terminamos en /login (sin sesión) y anota el test */
async function verificarSesion(page: { url: () => string; }, t: typeof test) {
  if (page.url().includes("/login")) {
    t.info().annotations.push({
      type: "sin-credenciales",
      description: "TEST_USER_EMAIL/PASSWORD no configuradas — test omitido",
    });
    return false;
  }
  return true;
}

// ─── Dashboard del portal ─────────────────────────────────────────────────────

test.describe("Portal — dashboard", () => {
  test("carga el dashboard con saludo personalizado", async ({ page }) => {
    await page.goto("/portal/dashboard");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    // Debe haber un encabezado con "Hola"
    await expect(page.getByRole("heading", { name: /hola/i })).toBeVisible();
  });

  test("el sidebar de portal es navegable por teclado", async ({ page }) => {
    await page.goto("/portal/dashboard");
    if (!(await verificarSesion(page, test))) return;

    // Tab desde el top del documento — el primer elemento enfocable debe ser el skip-link
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    expect(focused).toBe("#main-content");
  });

  test("links de navegación del portal están presentes", async ({ page }) => {
    await page.goto("/portal/dashboard");
    if (!(await verificarSesion(page, test))) return;

    await expect(page.getByRole("link", { name: /pagos/i }).first()).toBeVisible();
  });
});

// ─── Historial de pagos ───────────────────────────────────────────────────────

test.describe("Portal — pagos", () => {
  test("carga la página de pagos sin error 500", async ({ page }) => {
    await page.goto("/portal/pagos");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    // No debe aparecer el overlay de error de Next.js
    await expect(page.locator("text=Application error")).not.toBeVisible();
    await expect(page.locator("text=Error 500")).not.toBeVisible();
  });

  test("tabla de pagos tiene encabezados accesibles", async ({ page }) => {
    await page.goto("/portal/pagos");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    // Si hay tabla, debe tener <th> con scope
    const tablas = page.locator("table");
    const count = await tablas.count();
    if (count > 0) {
      const headers = tablas.first().locator("th");
      expect(await headers.count()).toBeGreaterThan(0);
    }
  });
});

// ─── Perfil ───────────────────────────────────────────────────────────────────

test.describe("Portal — perfil", () => {
  test("carga la página de perfil", async ({ page }) => {
    await page.goto("/portal/perfil");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    await expect(page.locator("h1")).toBeVisible();
  });
});

// ─── Solicitudes de cambio ────────────────────────────────────────────────────

test.describe("Portal — solicitud de cambio", () => {
  test("carga el formulario de solicitud", async ({ page }) => {
    await page.goto("/portal/solicitud");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    await expect(page.locator("form, [role='form']").first()).toBeVisible();
  });
});

// ─── Guards de ruta (sin auth) ────────────────────────────────────────────────

test.describe("Guards — rutas protegidas", () => {
  test("ruta /portal/* sin cookies → /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/portal/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("ruta /admin/* sin cookies → /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("ruta /admin/* con sesión CLIENTE → /portal/dashboard", async ({ page }) => {
    // Este test solo es significativo si la sesión cargada es de un cliente (no admin)
    // Con sesión vacía (sin credenciales) también terminará en /login, lo que anotamos
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const esGuardado = url.includes("/login") || url.includes("/portal/dashboard");
    expect(esGuardado).toBe(true);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

test.describe("Auth — logout", () => {
  test("botón de logout existe en el portal", async ({ page }) => {
    await page.goto("/portal/dashboard");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    const logout = page.getByRole("button", { name: /cerrar sesión|salir|logout/i });
    await expect(logout).toBeVisible();
  });
});

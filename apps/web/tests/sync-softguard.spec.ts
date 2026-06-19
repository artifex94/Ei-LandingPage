/**
 * Tests E2E — Integración SoftGuard (Fase 0)
 *
 * Corren con SOFTGUARD_MOCK=true (default en CI/dev sin credenciales reales).
 * El modo mock devuelve datos ficticios, permitiendo verificar la UI sin SQL Server.
 */
import { test, expect } from "@playwright/test";

async function verificarSesion(page: { url: () => string }, t: typeof test) {
  if (page.url().includes("/login")) {
    t.info().annotations.push({
      type: "sin-credenciales",
      description: "TEST_USER_EMAIL/PASSWORD no configuradas — test omitido",
    });
    return false;
  }
  return true;
}

test.describe("Admin — SoftGuard sync", () => {
  test("página de integración carga y muestra el panel de estado", async ({ page }) => {
    await page.goto("/admin/sync-softguard");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    // Título de la página
    await expect(page.getByRole("heading", { name: /integración softguard/i })).toBeVisible();

    // El botón de ping debe estar visible y habilitado
    const pingBtn = page.getByRole("button", { name: /probar conexión/i });
    await expect(pingBtn).toBeVisible();
    await expect(pingBtn).toBeEnabled();
  });

  test("botón de ping retorna estado correcto (mock o real)", async ({ page }) => {
    await page.goto("/admin/sync-softguard");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    const pingBtn = page.getByRole("button", { name: /probar conexión/i });

    // Escuchar respuesta del endpoint antes de clickear
    const responsePromise = page.waitForResponse("/api/sync-softguard/ping");
    await pingBtn.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("ok");
    expect(body).toHaveProperty("cuentas_count");
    expect(typeof body.cuentas_count).toBe("number");
    expect(body.cuentas_count).toBeGreaterThanOrEqual(0);

    // Después del ping el botón debe volver a estar habilitado
    await expect(pingBtn).toBeEnabled();
  });

  test("el endpoint ping requiere sesión de admin", async ({ request }) => {
    // Sin sesión → 401
    const res = await request.post("/api/sync-softguard/ping");
    expect(res.status()).toBe(401);
  });

  test("sidebar incluye ítem de SoftGuard", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("networkidle");
    if (!(await verificarSesion(page, test))) return;

    // En desktop el sidebar es visible
    await expect(
      page.getByRole("navigation", { name: /navegación del administrador/i }).first()
        .getByRole("link", { name: /softguard/i })
    ).toBeVisible();
  });
});

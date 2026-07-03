/**
 * Splash de marca de la landing: aparece en la primera visita y se
 * desvanece sola; no reaparece en la misma sesión; no existe bajo
 * prefers-reduced-motion.
 */
import { test, expect } from "@playwright/test";

test.describe("SplashScreen — landing", () => {
  test("primera visita: la cortina existe y se desvanece dejando el contenido operable", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const splash = page.locator("#ei-splash");
    // Primera visita: la cortina está montada (no display:none)
    await expect(splash).toBeAttached();
    expect(await splash.evaluate((el) => getComputedStyle(el).display)).not.toBe("none");

    // Se desvanece (JS o red de seguridad CSS) y libera los clicks
    await expect
      .poll(() => splash.evaluate((el) => getComputedStyle(el).visibility), { timeout: 6_000 })
      .toBe("hidden");
    await expect(page.getByRole("link", { name: /Solicitar presupuesto/ }).first()).toBeVisible();
  });

  test("misma sesión: no vuelve a aparecer (escondida antes del paint)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect
      .poll(() => page.locator("#ei-splash").evaluate((el) => getComputedStyle(el).visibility), {
        timeout: 6_000,
      })
      .toBe("hidden");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(
      await page.locator("#ei-splash").evaluate((el) => el.style.display)
    ).toBe("none");
  });

  test("con reduced-motion la cortina no existe", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(
      await page.locator("#ei-splash").evaluate((el) => getComputedStyle(el).display)
    ).toBe("none");
  });
});

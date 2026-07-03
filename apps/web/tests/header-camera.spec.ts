/**
 * Tests E2E de la cámara de vigilancia decorativa del header (HeaderCamera):
 * seguimiento del mouse con clamp, flash al click, y gates de viewport y
 * reduced-motion.
 *
 * Limitación conocida: Playwright no emula `pointer: coarse` vía emulateMedia;
 * ese gate queda cubierto por el de viewport (misma media query) y el guard
 * de matchMedia se ejercita con el resto.
 */
import { test, expect, type Page } from "@playwright/test";
import { CAM, CAM_REST_DEG } from "@/lib/ui/headerCamera";

const BODY = "[data-cam-body]";
const ROOT = "[data-flash]";

async function anguloActual(page: Page): Promise<number> {
  return page.locator(BODY).evaluate((el) => {
    const t = getComputedStyle(el).transform;
    if (t === "none") return 0;
    const [a, b] = t.replace("matrix(", "").split(",").map(Number);
    return (Math.atan2(b, a) * 180) / Math.PI;
  });
}

test.describe("HeaderCamera — seguimiento y flash (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("sigue al mouse dentro del rango físico y respeta el clamp", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(ROOT)).toBeVisible();
    // Esperar a que la hidratación cuelgue los listeners de seguimiento
    await expect(page.locator('[data-cam-active="1"]')).toBeAttached();

    // Lejos a la derecha, casi horizontal → aim clampeado al mínimo
    await page.mouse.move(1300, 130);
    await expect
      .poll(() => anguloActual(page), { timeout: 10_000 })
      .toBeCloseTo(CAM.AIM_MIN - CAM.A0, 0);

    // Abajo a la izquierda, casi vertical → aim clampeado al máximo
    await page.mouse.move(100, 850);
    await expect
      .poll(() => anguloActual(page), { timeout: 10_000 })
      .toBeCloseTo(CAM.AIM_MAX - CAM.A0, 0);

    // Diagonal lejana → aim intermedio, sin clamp
    await page.mouse.move(1300, 850);
    await expect
      .poll(() => anguloActual(page), { timeout: 10_000 })
      .toBeLessThan(CAM.AIM_MAX - CAM.A0);
    expect(await anguloActual(page)).toBeGreaterThan(CAM.AIM_MIN - CAM.A0);
  });

  test("cada click dispara el flash (remonta en clicks consecutivos)", async ({ page }) => {
    await page.goto("/");
    const root = page.locator(ROOT);
    await expect(root).toHaveAttribute("data-flash", "0");

    await page.mouse.click(700, 500);
    await expect(root).toHaveAttribute("data-flash", "1");
    await expect(page.locator(".cam-flash")).toBeAttached();

    await page.mouse.click(700, 500);
    await page.mouse.click(700, 500);
    await expect(root).toHaveAttribute("data-flash", "3");
  });

  test("no intercepta clicks: un click sobre la cámara llega al contenido de abajo", async ({
    page,
  }) => {
    await page.goto("/");
    const box = await page.locator(ROOT).boundingBox();
    expect(box).not.toBeNull();
    // elementFromPoint sobre el centro de la cámara debe resolver a otro elemento
    const tag = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest("[data-flash]")?.tagName ?? "PASA",
      [box!.x + box!.width / 2, box!.y + box!.height / 2]
    );
    expect(tag).toBe("PASA");
  });

  test("sigue funcionando tras el scroll (pivote remedido)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-cam-active="1"]')).toBeAttached();
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 600);
    });
    await page.waitForTimeout(400); // transición py-4 → py-2 del nav

    await page.mouse.move(1300, 130);
    await expect
      .poll(() => anguloActual(page), { timeout: 10_000 })
      .toBeCloseTo(CAM.AIM_MIN - CAM.A0, 0);
    await page.mouse.move(100, 850);
    await expect
      .poll(() => anguloActual(page), { timeout: 10_000 })
      .toBeCloseTo(CAM.AIM_MAX - CAM.A0, 0);
  });
});

test.describe("HeaderCamera — gates", () => {
  test("oculta en viewport menor a lg", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 });
    await page.goto("/");
    await expect(page.locator(ROOT)).toBeHidden();
  });

  test("con reduced-motion queda estática en reposo y el click no destella", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.mouse.move(100, 850);
    await page.waitForTimeout(600);
    expect(await anguloActual(page)).toBeCloseTo(CAM_REST_DEG, 0);

    await page.mouse.click(700, 500);
    await expect(page.locator(ROOT)).toHaveAttribute("data-flash", "0");
    await expect(page.locator(".cam-flash")).toHaveCount(0);
  });
});

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

  test("la luz prende al presionar, se mantiene presionada y se desvanece al soltar", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-cam-active="1"]')).toBeAttached();
    const root = page.locator(ROOT);
    const flash = page.locator(".cam-flash");
    await expect(root).toHaveAttribute("data-flash", "0");
    await expect(flash).toHaveCSS("opacity", "0");

    await page.mouse.move(700, 500);
    await page.mouse.down();
    await expect(root).toHaveAttribute("data-flash", "1");
    await expect(flash).toHaveCSS("opacity", "1");

    // Mantiene la intensidad plena mientras el botón sigue presionado
    // (mucho más que los 320ms del desvanecimiento)
    await page.waitForTimeout(700);
    await expect(flash).toHaveCSS("opacity", "1");

    // Al soltar, se apaga (transición de salida de 320ms)
    await page.mouse.up();
    await expect(root).toHaveAttribute("data-flash", "0");
    await expect
      .poll(() => flash.evaluate((el) => Number(getComputedStyle(el).opacity)), {
        timeout: 3_000,
      })
      .toBe(0);
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

async function rotacionMount(page: Page): Promise<number> {
  return page.locator("[data-cam-mount]").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    if (t === "none") return 0;
    const [a, b] = t.replace("matrix(", "").split(",").map(Number);
    return (Math.atan2(b, a) * 180) / Math.PI;
  });
}

test.describe("HeaderCamera — anclaje pared/techo", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("al tope se sujeta de la pared; con la línea del nav cuelga del techo", async ({
    page,
  }) => {
    await page.goto("/");
    const carrier = page.locator("[data-cam-wall]");

    // Tope de página: modo pared (soporte rotado -90°, corrido al borde)
    await expect(carrier).toHaveAttribute("data-cam-wall", "1");
    await expect.poll(() => rotacionMount(page), { timeout: 10_000 }).toBeCloseTo(-90, 0);

    // Aparece la línea dura del nav: re-asiento a modo techo
    await expect(page.locator('[data-cam-active="1"]')).toBeAttached();
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 200);
    });
    await expect(carrier).toHaveAttribute("data-cam-wall", "0");
    await expect.poll(() => rotacionMount(page), { timeout: 10_000 }).toBeCloseTo(0, 0);

    // El seguimiento sigue calibrado tras el re-asiento (pivote remedido)
    await page.mouse.move(1300, 130);
    await expect
      .poll(() => anguloActual(page), { timeout: 10_000 })
      .toBeCloseTo(CAM.AIM_MIN - CAM.A0, 0);

    // De vuelta al tope: modo pared otra vez
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(carrier).toHaveAttribute("data-cam-wall", "1");
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

    await page.mouse.move(700, 500);
    await page.mouse.down();
    await expect(page.locator(ROOT)).toHaveAttribute("data-flash", "0");
    await expect(page.locator(".cam-flash")).toHaveCSS("opacity", "0");
    await page.mouse.up();
  });
});

test.describe("HeaderCamera — acompaña la búsqueda del monitor", () => {
  test.use({ viewport: { width: 1920, height: 900 } });

  test("cuando el monitor busca, la cámara barre; al reencontrar, vuelve a seguir", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-cam-active="1"]')).toBeAttached();
    await expect(page.locator('[data-monitor-active="1"]')).toBeAttached();

    // Escape por arriba → búsqueda: el ángulo de la cámara cambia solo
    await page.mouse.move(900, 40);
    await expect(page.locator('[data-cctv-clone][data-buscando="1"]')).toBeAttached();
    const a1 = await anguloActual(page);
    await page.waitForTimeout(900);
    const a2 = await anguloActual(page);
    await page.waitForTimeout(900);
    const a3 = await anguloActual(page);
    expect(Math.abs(a2 - a1) + Math.abs(a3 - a2)).toBeGreaterThan(1);

    // Reencuentro: vuelve a apuntar al mouse
    await page.mouse.move(1300, 130);
    await expect
      .poll(() => anguloActual(page), { timeout: 10_000 })
      .toBeCloseTo(CAM.AIM_MIN - CAM.A0, 0);
  });
});

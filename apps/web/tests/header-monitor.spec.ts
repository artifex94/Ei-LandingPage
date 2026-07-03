/**
 * Tests E2E del monitor CCTV del navbar (HeaderMonitor): centrado matemático
 * del paneo, seguimiento del scroll, sanitización del clon y gates de
 * viewport (2xl) y reduced-motion.
 */
import { test, expect, type Page } from "@playwright/test";
import { calcularTransformMonitor } from "@/lib/ui/headerMonitor";

const CLONE = "[data-cctv-clone]";

async function transformActual(page: Page): Promise<{ tx: number; ty: number }> {
  return page.locator(CLONE).evaluate((el) => {
    const t = getComputedStyle(el).transform;
    if (t === "none") return { tx: 0, ty: 0 };
    const p = t.replace("matrix(", "").replace(")", "").split(",").map(Number);
    return { tx: p[4], ty: p[5] };
  });
}

async function distanciaAlTarget(page: Page, pageX: number, pageY: number): Promise<number> {
  const esperado = calcularTransformMonitor(pageX, pageY);
  const actual = await transformActual(page);
  return Math.abs(actual.tx - esperado.tx) + Math.abs(actual.ty - esperado.ty);
}

test.describe("HeaderMonitor — pantallita CCTV (2xl)", () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test("el punto bajo el mouse queda centrado en la pantalla", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-monitor-active="1"]')).toBeAttached();

    await page.mouse.move(500, 460);
    await expect
      .poll(() => distanciaAlTarget(page, 500, 460), { timeout: 10_000 })
      .toBeLessThan(1.5);

    await page.mouse.move(1200, 200);
    await expect
      .poll(() => distanciaAlTarget(page, 1200, 200), { timeout: 10_000 })
      .toBeLessThan(1.5);
  });

  test("panea con el scroll (coordenadas de documento)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-monitor-active="1"]')).toBeAttached();
    await page.mouse.move(800, 450);
    await expect
      .poll(() => distanciaAlTarget(page, 800, 450), { timeout: 10_000 })
      .toBeLessThan(1.5);

    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 400);
    });
    // Mismo mouse en viewport, pero el punto de documento bajó 400px
    await expect
      .poll(() => distanciaAlTarget(page, 800, 450 + 400), { timeout: 10_000 })
      .toBeLessThan(1.5);
  });

  test("el clon está sanitizado e inerte", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-monitor-active="1"]')).toBeAttached();
    const info = await page.locator(CLONE).evaluate((holder) => {
      const clone = holder.firstElementChild;
      return {
        existe: clone !== null,
        inert: clone?.hasAttribute("inert") ?? false,
        ariaHidden: clone?.getAttribute("aria-hidden") ?? null,
        scripts: clone?.querySelectorAll("script, iframe, noscript").length ?? -1,
        ids: clone?.querySelectorAll("[id]").length ?? -1,
        fuentes: document.querySelectorAll("[data-cctv-source]").length,
      };
    });
    expect(info.existe).toBe(true);
    expect(info.inert).toBe(true);
    expect(info.ariaHidden).toBe("true");
    expect(info.scripts).toBe(0);
    expect(info.ids).toBe(0);
    expect(info.fuentes).toBe(1);
  });

  test("no intercepta clicks (pointer-events none)", async ({ page }) => {
    await page.goto("/");
    const box = await page.locator("[data-cctv-root] .cctv-screen").boundingBox();
    expect(box).not.toBeNull();
    const tag = await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x, y)?.closest("[data-cctv-root]")?.tagName ?? "PASA",
      [box!.x + box!.width / 2, box!.y + box!.height / 2]
    );
    expect(tag).toBe("PASA");
  });
});

test.describe("HeaderMonitor — gates", () => {
  test("oculto bajo 2xl", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("[data-cctv-root]")).toBeHidden();
  });

  test("con reduced-motion muestra el feed estático sin seguir al mouse", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/");

    // El feed existe (clon montado) pero el seguimiento no se activa
    await expect
      .poll(() => page.locator(CLONE).evaluate((h) => h.childElementCount), {
        timeout: 10_000,
      })
      .toBe(1);
    await expect(page.locator('[data-monitor-active="1"]')).toHaveCount(0);

    // Encuadre estático inicial: centrado en el centro del viewport (1600×900)
    const estatico = calcularTransformMonitor(800, 450);
    await expect
      .poll(() => transformActual(page).then((t) => t.tx), { timeout: 10_000 })
      .toBeCloseTo(estatico.tx, 0);

    // Mover el mouse no panea el feed
    await page.mouse.move(200, 700);
    await page.waitForTimeout(500);
    const despues = await transformActual(page);
    expect(despues.tx).toBeCloseTo(estatico.tx, 1);
    expect(despues.ty).toBeCloseTo(estatico.ty, 1);
  });
});

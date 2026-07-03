/**
 * Accesibilidad del modal de servicios (mobile): focus trap y retorno de foco.
 * WCAG 2.1.2 (No Keyboard Trap inverso — el foco no debe escapar del diálogo
 * modal) y 2.4.3 (Focus Order — al cerrar, el foco vuelve al disparador).
 */
import { test, expect } from "@playwright/test";

test.describe("Modal de servicios — foco (mobile)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("atrapa el foco y lo devuelve al disparador al cerrar", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Alarmas monitoreadas" });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // El foco entra al diálogo (el botón X, no el backdrop). Ambos tienen
    // aria-label "Cerrar"; el disparador de foco es el segundo.
    await expect(page.getByRole("button", { name: "Cerrar" }).nth(1)).toBeFocused();

    // Tab varias veces: el foco nunca sale del diálogo
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const dentro = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return dlg?.contains(document.activeElement) ?? false;
      });
      expect(dentro).toBe(true);
    }

    // Escape cierra y el foco vuelve al botón que lo abrió
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

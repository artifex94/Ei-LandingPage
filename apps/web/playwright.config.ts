import { defineConfig, devices } from "@playwright/test";

/**
 * Tests E2E y a11y — EscobarInstalaciones
 *
 * Requisitos para correr:
 *   - `npm run dev` corriendo en :3000, O dejar que webServer lo inicie.
 *   - Para tests con auth: `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` en .env.local
 *
 * Ejecución:
 *   npx playwright test                  # todos los tests
 *   npx playwright test tests/a11y       # solo accesibilidad
 *   npx playwright test tests/flujos     # solo E2E funcionales
 *   npx playwright test tests/billing    # solo unit billing-state
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Setup: crea el archivo de sesión autenticada (se salta si no hay credenciales)
    {
      name: "setup",
      testMatch: ["**/auth.setup.ts"],
    },
    // Tests que NO requieren auth
    {
      name: "public",
      testMatch: ["**/a11y.spec.ts", "**/billing.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    // Tests que requieren auth (dependen de setup)
    {
      name: "autenticado",
      testMatch: ["**/flujos.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

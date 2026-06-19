/**
 * Setup: inicia sesión con credenciales de test y guarda el storageState.
 * Se salta automáticamente si TEST_USER_EMAIL / TEST_USER_PASSWORD no están definidas.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("autenticar usuario de test", async ({ page }) => {
  const email    = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.log("  ⚠  TEST_USER_EMAIL / TEST_USER_PASSWORD no configuradas — omitiendo setup de auth");
    // Guardar estado vacío para que los tests con storageState no fallen al cargar el archivo
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /ingresar/i }).click();

  // Esperar a llegar al portal
  await expect(page).toHaveURL(/\/portal\/dashboard/, { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    // SoftGuard envía hora local de Argentina sin offset y el negocio es 100%
    // AR. Fijamos el TZ del proceso de test para que las aserciones sobre
    // horas (getHours, fechaAR) sean deterministas en cualquier runner
    // (local y CI corren en UTC). Ver lib/fecha-ar y softguard/api/monitoreo.
    env: { TZ: "America/Argentina/Buenos_Aires" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

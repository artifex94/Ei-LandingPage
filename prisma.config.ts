// prisma.config.ts — configuración del CLI de Prisma (migraciones)
// La URL aquí es la DIRECTA (sin Supavisor) — requerida para DDL
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

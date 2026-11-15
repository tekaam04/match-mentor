import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Neon gives a pooled URL for the app and a direct one for migrations; locally they're the same.
    // Optional here so `prisma generate` (run on install) works before a database is connected;
    // migrate and seed still fail clearly if neither is set.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
});

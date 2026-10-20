import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Neon gives a pooled URL for the app and a direct one for migrations; locally they're the same.
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});

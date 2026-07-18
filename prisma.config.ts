import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run prisma/seed.ts",
  },
  datasource: {
    // Use a direct Neon URL for migrations when available; fall back to DATABASE_URL.
    url: process.env.DIRECT_DATABASE_URL ?? env("DATABASE_URL"),
  },
});

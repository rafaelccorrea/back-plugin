import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Supabase: use DIRECT_URL para migrations (pooler não suporta DDL bem)
const connectionString =
  process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL ou DIRECT_URL é obrigatório para o Drizzle");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});

/**
 * Marca a migration 0000_sleepy_tana_nile como já aplicada (para quando as tabelas já existem no banco).
 * Uso: node scripts/db-mark-migration-applied.mjs
 * Depois: npm run db:migrate
 */
import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const { Client } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Defina DIRECT_URL ou DATABASE_URL no .env");
  process.exit(1);
}

const drizzleDir = path.join(process.cwd(), "drizzle");
const journalPath = path.join(drizzleDir, "meta", "_journal.json");
const sqlPath = path.join(drizzleDir, "0000_sleepy_tana_nile.sql");

const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
const entry = journal.entries.find((e) => e.tag === "0000_sleepy_tana_nile");
if (!entry) {
  console.error("Migration 0000_sleepy_tana_nile não encontrada no journal");
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, "utf-8");
const hash = createHash("sha256").update(sqlContent).digest("hex");
const folderMillis = entry.when;

const client = new Client({ connectionString });

async function main() {
  await client.connect();

  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const check = await client.query(
    "SELECT id FROM drizzle.__drizzle_migrations WHERE created_at = $1 OR hash = $2 LIMIT 1",
    [folderMillis, hash]
  );
  if (check.rows.length > 0) {
    console.log("Migration 0000_sleepy_tana_nile já está marcada como aplicada.");
    await client.end();
    return;
  }

  await client.query(
    "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
    [hash, folderMillis]
  );
  console.log("Migration 0000_sleepy_tana_nile marcada como aplicada (hash, created_at).");
  console.log("Agora você pode rodar: npm run db:migrate");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

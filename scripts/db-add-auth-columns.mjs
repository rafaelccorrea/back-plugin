/**
 * Adiciona colunas de auth na tabela users (camelCase, igual ao resto do banco).
 * Uso: node scripts/db-add-auth-columns.mjs
 */
import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Defina DIRECT_URL ou DATABASE_URL no .env");
  process.exit(1);
}

const client = new Client({ connectionString });

const columns = [
  { name: "passwordHash", sql: 'ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255)' },
  { name: "emailVerified", sql: 'ADD COLUMN IF NOT EXISTS "emailVerified" boolean DEFAULT false' },
  { name: "emailVerificationToken", sql: 'ADD COLUMN IF NOT EXISTS "emailVerificationToken" varchar(255)' },
  { name: "emailVerificationExpires", sql: 'ADD COLUMN IF NOT EXISTS "emailVerificationExpires" timestamp' },
  { name: "passwordResetToken", sql: 'ADD COLUMN IF NOT EXISTS "passwordResetToken" varchar(255)' },
  { name: "passwordResetExpires", sql: 'ADD COLUMN IF NOT EXISTS "passwordResetExpires" timestamp' },
  { name: "googleId", sql: 'ADD COLUMN IF NOT EXISTS "googleId" varchar(255) UNIQUE' },
];

async function main() {
  try {
    await client.connect();
    for (const col of columns) {
      await client.query(`ALTER TABLE users ${col.sql}`);
      console.log("Coluna adicionada/verificada:", col.name);
    }
    console.log("\nConcluído.");
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

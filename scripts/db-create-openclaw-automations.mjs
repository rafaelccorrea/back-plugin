/**
 * Cria a tabela openClawAutomations no banco.
 * Uso: node scripts/db-create-openclaw-automations.mjs
 */
import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não encontrada");
  process.exit(1);
}

const client = new Client({ connectionString });

async function run(sql, label) {
  try {
    await client.query(sql);
    console.log("OK:", label);
  } catch (err) {
    if (err.code === "42P07") console.log("Já existe:", label);
    else {
      console.error(`Erro em ${label}:`, err.message);
      throw err;
    }
  }
}

async function main() {
  await client.connect();

  await run(
    `CREATE TABLE IF NOT EXISTS "openClawAutomations" (
      "id" serial PRIMARY KEY NOT NULL,
      "userId" integer NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "triggerEvent" varchar(100) NOT NULL,
      "minScore" numeric(3, 2) DEFAULT '0.00',
      "actionType" varchar(100) NOT NULL,
      "actionConfig" text,
      "executionMode" varchar(50) DEFAULT 'manual_approval',
      "isActive" boolean DEFAULT true,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela openClawAutomations"
  );

  await run(
    `CREATE INDEX IF NOT EXISTS "openclaw_automation_user_idx" ON "openClawAutomations" ("userId")`,
    "índice openclaw_automation_user_idx"
  );

  await client.end();
  console.log("\nTabela openClawAutomations configurada com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

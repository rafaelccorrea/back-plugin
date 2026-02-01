/**
 * Cria a tabela open_claw_automations no banco usado pela aplicação (DATABASE_URL).
 * Use quando a relação "open_claw_automations" does not exist.
 *
 * Uso: node scripts/ensure-open-claw-table.mjs
 */
import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não encontrada no .env");
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
      console.error("Erro em", label, ":", err.message);
      throw err;
    }
  }
}

async function main() {
  await client.connect();
  console.log("Conectado ao banco (DATABASE_URL). Criando tabela open_claw_automations...\n");

  await run(
    `CREATE TABLE IF NOT EXISTS "open_claw_automations" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "trigger_event" varchar(100) NOT NULL,
      "min_score" numeric(3, 2) DEFAULT '0.00',
      "action_type" varchar(100) NOT NULL,
      "action_config" text,
      "execution_mode" varchar(50) DEFAULT 'manual_approval',
      "is_active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela open_claw_automations"
  );

  await run(
    `CREATE INDEX IF NOT EXISTS "openclaw_automation_user_idx" ON "open_claw_automations" ("user_id")`,
    "índice openclaw_automation_user_idx"
  );

  // Adicionar coluna execution_mode se a tabela já existia sem ela
  try {
    await client.query(
      `ALTER TABLE "open_claw_automations" ADD COLUMN IF NOT EXISTS "execution_mode" varchar(50) DEFAULT 'manual_approval'`
    );
    console.log("OK: coluna execution_mode (se faltando)");
  } catch (err) {
    if (err.code === "42701") console.log("Coluna execution_mode já existe");
    else throw err;
  }

  await client.end();
  console.log("\nTabela open_claw_automations pronta. Reinicie o servidor e teste de novo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Cria a tabela automations no banco (snake_case, alinhado ao schema Drizzle).
 * Uso: node scripts/db-create-automations.mjs
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

async function run(sql, label) {
  try {
    await client.query(sql);
    console.log("OK:", label);
  } catch (err) {
    if (err.code === "42P07") console.log("Já existe:", label);
    else throw err;
  }
}

async function main() {
  await client.connect();

  await run(
    `DROP TABLE IF EXISTS "automations"`,
    "drop automations (se existir)"
  );
  await run(
    `CREATE TABLE "automations" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "trigger" varchar(64) NOT NULL,
      "action" varchar(64) NOT NULL,
      "message" text,
      "conditions" text NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela automations"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS "automation_user_idx" ON "automations" USING btree ("user_id")`,
    "índice automation_user_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS "automation_is_active_idx" ON "automations" USING btree ("is_active")`,
    "índice automation_is_active_idx"
  );

  await client.end();
  console.log("\nTabela automations criada com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

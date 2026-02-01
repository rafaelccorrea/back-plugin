/**
 * Cria a tabela appointments no banco (snake_case, compatível com o schema Drizzle).
 * Uso: node scripts/db-create-appointments-table.mjs
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
    `CREATE TABLE IF NOT EXISTS "appointments" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "lead_id" integer NOT NULL,
      "title" varchar(255) NOT NULL,
      "description" text,
      "type" varchar(50) DEFAULT 'visit',
      "start_time" timestamp NOT NULL,
      "end_time" timestamp,
      "status" varchar(50) DEFAULT 'scheduled',
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela appointments"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS "appointment_user_idx" ON "appointments" USING btree ("user_id")`,
    "índice appointment_user_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS "appointment_lead_idx" ON "appointments" USING btree ("lead_id")`,
    "índice appointment_lead_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS "appointment_start_time_idx" ON "appointments" USING btree ("start_time")`,
    "índice appointment_start_time_idx"
  );

  await client.end();
  console.log("\nTabela appointments criada/verificada com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

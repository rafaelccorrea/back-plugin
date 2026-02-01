/**
 * Adiciona a coluna qualificationChecklist na tabela leads (se não existir).
 * Banco em camelCase: usa "qualificationChecklist".
 * Uso: node scripts/db-add-leads-qualification.mjs
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

async function main() {
  await client.connect();
  await client.query(`
    ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "qualificationChecklist" text;
  `);
  console.log("Coluna qualificationChecklist verificada/adicionada em leads.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

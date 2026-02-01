/**
 * Cria enums e tabelas de suporte (supportTickets, supportMessages) no Supabase (camelCase).
 * Uso: node scripts/db-create-support-tables.mjs
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

  // Enums para tickets (ignorar se já existirem)
  await run(
    `DO $$ BEGIN
      CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'resolved');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    "enum ticket_status"
  );
  await run(
    `DO $$ BEGIN
      CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    "enum ticket_priority"
  );

  // Tabela supportTickets
  await run(
    `CREATE TABLE IF NOT EXISTS "supportTickets" (
      "id" serial PRIMARY KEY,
      "userId" integer NOT NULL,
      "subject" varchar(255) NOT NULL,
      "status" ticket_status DEFAULT 'open' NOT NULL,
      "priority" ticket_priority DEFAULT 'medium' NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL,
      "resolvedAt" timestamp
    )`,
    "tabela supportTickets"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS ticket_user_idx ON "supportTickets" ("userId")`,
    "índice ticket_user_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS ticket_status_idx ON "supportTickets" ("status")`,
    "índice ticket_status_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS ticket_priority_idx ON "supportTickets" ("priority")`,
    "índice ticket_priority_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS ticket_created_at_idx ON "supportTickets" ("createdAt")`,
    "índice ticket_created_at_idx"
  );

  // Tabela supportMessages
  await run(
    `CREATE TABLE IF NOT EXISTS "supportMessages" (
      "id" serial PRIMARY KEY,
      "ticketId" integer NOT NULL,
      "userId" integer,
      "senderType" varchar(20) NOT NULL,
      "message" text NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela supportMessages"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS message_ticket_idx ON "supportMessages" ("ticketId")`,
    "índice message_ticket_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS message_user_idx ON "supportMessages" ("userId")`,
    "índice message_user_idx"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS message_created_at_idx ON "supportMessages" ("createdAt")`,
    "índice message_created_at_idx"
  );

  await client.end();
  console.log("\nTabelas de suporte criadas/verificadas com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

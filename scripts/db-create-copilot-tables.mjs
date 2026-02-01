#!/usr/bin/env node
/**
 * Cria as tabelas do Copiloto IA (ai_copilot_conversations, ai_copilot_messages).
 * Rode: node scripts/db-create-copilot-tables.mjs
 * Requer: DATABASE_URL ou DIRECT_URL no .env
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Defina DATABASE_URL ou DIRECT_URL no .env");
  process.exit(1);
}

const sqlPath = join(__dirname, "..", "drizzle", "0012_ai_copilot_conversations.sql");
const sqlTitle = join(__dirname, "..", "drizzle", "0014_copilot_conversation_title.sql");
const sql = readFileSync(sqlPath, "utf-8");
const sqlTitleContent = readFileSync(sqlTitle, "utf-8");

async function main() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Tabelas do Copiloto criadas: ai_copilot_conversations, ai_copilot_messages");
    try {
      await client.query(sqlTitleContent);
      console.log("Coluna title adicionada em ai_copilot_conversations");
    } catch (e) {
      if (!e.message?.includes("already exists")) console.warn("Aviso ao adicionar title:", e.message);
    }
  } catch (err) {
    console.error("Erro ao criar tabelas:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

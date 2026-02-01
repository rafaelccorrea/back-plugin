/**
 * Cria enums e tabelas de sentiment no Supabase (camelCase).
 * Uso: node scripts/db-create-sentiment-tables.mjs
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

  // Enums para sentiment (ignorar se já existirem)
  await run(
    `DO $$ BEGIN
      CREATE TYPE sentiment AS ENUM ('positive', 'negative', 'neutral');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    "enum sentiment"
  );
  await run(
    `DO $$ BEGIN
      CREATE TYPE sentiment_urgency AS ENUM ('low', 'medium', 'high');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    "enum sentiment_urgency"
  );
  await run(
    `DO $$ BEGIN
      CREATE TYPE sentiment_tone AS ENUM ('friendly', 'frustrated', 'neutral', 'excited');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    "enum sentiment_tone"
  );

  // Tabela sentimentAnalyses
  await run(
    `CREATE TABLE IF NOT EXISTS "sentimentAnalyses" (
      "id" serial PRIMARY KEY,
      "conversationId" varchar(255) NOT NULL,
      "message" text NOT NULL,
      "sentiment" sentiment NOT NULL,
      "score" numeric(3,2) NOT NULL,
      "confidence" numeric(3,2) NOT NULL,
      "keywords" text NOT NULL,
      "urgency" sentiment_urgency NOT NULL,
      "emotions" text,
      "tone" sentiment_tone,
      "suggestedResponse" text,
      "createdAt" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela sentimentAnalyses"
  );

  // Tabela conversationSummaries
  await run(
    `CREATE TABLE IF NOT EXISTS "conversationSummaries" (
      "id" serial PRIMARY KEY,
      "conversationId" varchar(255) NOT NULL UNIQUE,
      "totalMessages" integer DEFAULT 0,
      "positiveCount" integer DEFAULT 0,
      "negativeCount" integer DEFAULT 0,
      "neutralCount" integer DEFAULT 0,
      "averageScore" numeric(3,2) DEFAULT 0.50,
      "sentimentTrend" varchar(20),
      "overallSatisfaction" varchar(50),
      "updatedAt" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela conversationSummaries"
  );

  // Tabela sentimentAlerts
  await run(
    `CREATE TABLE IF NOT EXISTS "sentimentAlerts" (
      "id" serial PRIMARY KEY,
      "conversationId" varchar(255) NOT NULL,
      "messageId" varchar(255) NOT NULL,
      "sentiment" sentiment NOT NULL,
      "urgency" sentiment_urgency NOT NULL,
      "alertSent" boolean DEFAULT false,
      "resolvedAt" timestamp,
      "createdAt" timestamp DEFAULT now() NOT NULL
    )`,
    "tabela sentimentAlerts"
  );

  // Índices
  await run(
    `CREATE INDEX IF NOT EXISTS sentiment_conversation_idx ON "sentimentAnalyses" ("conversationId")`,
    "índice sentimentAnalyses"
  );
  await run(
    `CREATE INDEX IF NOT EXISTS alert_conversation_idx ON "sentimentAlerts" ("conversationId")`,
    "índice sentimentAlerts"
  );

  console.log("\nConcluído.");
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
}).finally(() => client.end());

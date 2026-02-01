/**
 * Adiciona o valor 'support_reply' ao tipo de notificação no banco.
 * Suporta: (1) enum notification_type ou (2) CHECK constraint notifications_type_check.
 * Uso: node scripts/db-add-notification-type-support-reply.mjs
 */
import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Defina DIRECT_URL ou DATABASE_URL no .env");
  process.exit(1);
}

const ALL_NOTIFICATION_TYPES = [
  "new_lead",
  "quota_warning",
  "quota_exceeded",
  "payment_failed",
  "subscription_updated",
  "lead_status_changed",
  "system_alert",
  "support_reply",
  "new_support_ticket",
];

const client = new Client({ connectionString });

async function main() {
  await client.connect();
  try {
    // Tenta adicionar ao enum (se o banco usar tipo ENUM)
    try {
      await client.query(`
        ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'support_reply';
      `);
      console.log("Valor 'support_reply' adicionado ao enum notification_type.");
      return;
    } catch (enumErr) {
      if (enumErr.code === "42704") {
        // type "notification_type" does not exist → provavelmente usa CHECK constraint
        console.log("Tipo notification_type não existe; verificando constraint CHECK...");
      } else if (enumErr.code === "42804" || enumErr.message?.includes("already exists")) {
        console.log("Valor 'support_reply' já existe no enum.");
        return;
      } else {
        throw enumErr;
      }
    }

    // Coluna usa CHECK constraint: remover e recriar com support_reply
    await client.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_type_check";
    `);
    const inList = ALL_NOTIFICATION_TYPES.map((t) => `'${t}'`).join(", ");
    await client.query(`
      ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check"
      CHECK (type IN (${inList}));
    `);
    console.log("Constraint notifications_type_check atualizada com 'support_reply'.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

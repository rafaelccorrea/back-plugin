/**
 * Script para garantir que todo usuário tem plano FREE e registro na tabela subscriptions.
 * - Corrige users.plan inválido → free.
 * - Quem não tem assinatura paga ativa → users.plan = free e limpa subscription em users.
 * - Obrigatório: todo usuário SEM nenhum registro em subscriptions → cria registro FREE em subscriptions.
 * Uso: npx tsx scripts/fix-users-without-plan.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const VALID_PLANS = ["free", "starter", "professional", "enterprise"] as const;

async function getOrCreateFreePlanId(pool: Pool): Promise<number> {
  const byStripe = await pool.query<{ id: number }>(
    `SELECT id FROM plans WHERE "stripePriceId" = 'free' LIMIT 1`
  );
  if (byStripe.rows.length > 0) return byStripe.rows[0].id;
  try {
    const inserted = await pool.query<{ id: number }>(
      `INSERT INTO plans (name, description, "stripePriceId", "monthlyLeadsQuota", "monthlyApiCalls", "priceInCents", currency)
       VALUES ('Gratis', 'Plano gratuito', 'free', 10, 100, 0, 'USD') RETURNING id`
    );
    if (inserted.rows.length > 0) return inserted.rows[0].id;
  } catch {
    const sel = await pool.query<{ id: number }>(`SELECT id FROM plans WHERE "stripePriceId" = 'free' LIMIT 1`);
    if (sel.rows.length > 0) return sel.rows[0].id;
  }
  throw new Error("Falha ao obter/criar plano free");
}

async function main() {
  console.log("🔍 Garantindo que todo usuário tem plano e registro em subscriptions...\n");

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Defina DATABASE_URL ou DIRECT_URL no .env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const colCheck = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plan' LIMIT 1`
    );
    if (colCheck.rows.length === 0) {
      console.log("⚠️ Coluna 'plan' não existe. Aplicando migration (enum + coluna)...\n");
      await pool.query('CREATE TYPE "plan" AS ENUM (\'free\', \'starter\', \'professional\', \'enterprise\')').catch(() => {});
      await pool.query('ALTER TABLE "users" ADD COLUMN "plan" "plan" DEFAULT \'free\' NOT NULL');
      console.log("✅ Migration aplicada.\n");
    }

    const activeSubsResult = await pool.query<{ userId: number }>(
      `SELECT DISTINCT "userId" FROM subscriptions WHERE status IN ('active', 'past_due')`
    );
    const userIdsWithActiveSubscription = new Set(activeSubsResult.rows.map((r) => r.userId));
    const allSubsResult = await pool.query<{ userId: number }>(`SELECT DISTINCT "userId" FROM subscriptions`);
    const userIdsWithAnySubscription = new Set(allSubsResult.rows.map((r) => r.userId));

    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      subscriptionStatus: users.subscriptionStatus,
      stripeSubscriptionId: users.stripeSubscriptionId,
    }).from(users);

    let totalFixed = 0;

    const withoutValidPlan = allUsers.filter(
      (u) => u.plan == null || (typeof u.plan === "string" && !VALID_PLANS.includes(u.plan as typeof VALID_PLANS[number]))
    );
    if (withoutValidPlan.length > 0) {
      console.log(`📋 ${withoutValidPlan.length} usuário(s) sem plano válido → plan=free\n`);
      for (const u of withoutValidPlan) {
        await db.update(users).set({ plan: "free", updatedAt: new Date() }).where(eq(users.id, u.id));
        totalFixed++;
      }
    }

    const withoutSubscriptionInTable = allUsers.filter((u) => !userIdsWithActiveSubscription.has(u.id));
    const toNormalize = withoutSubscriptionInTable.filter(
      (u) => u.plan !== "free" || u.subscriptionStatus != null || u.stripeSubscriptionId != null
    );
    if (toNormalize.length > 0) {
      console.log(`📋 ${toNormalize.length} usuário(s) sem assinatura ativa → users normalizados para free\n`);
      for (const u of toNormalize) {
        await db.update(users).set({
          plan: "free",
          subscriptionStatus: null,
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        }).where(eq(users.id, u.id));
        totalFixed++;
      }
    }

    const missingSubscriptionRecord = allUsers.filter((u) => !userIdsWithAnySubscription.has(u.id));
    if (missingSubscriptionRecord.length > 0) {
      console.log(`📋 ${missingSubscriptionRecord.length} usuário(s) sem NENHUM registro em subscriptions → criando registro FREE\n`);
      const freePlanId = await getOrCreateFreePlanId(pool);
      const now = new Date();
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 10);
      for (const u of missingSubscriptionRecord) {
        await pool.query(
          `INSERT INTO subscriptions ("userId", "planId", "stripeSubscriptionId", status, "currentPeriodStart", "currentPeriodEnd")
           VALUES ($1, $2, $3, 'active', $4, $5)
           ON CONFLICT ("stripeSubscriptionId") DO NOTHING`,
          [u.id, freePlanId, `free_${u.id}`, now, end]
        );
        totalFixed++;
      }
      console.log(`✅ Registro FREE em subscriptions criado para ${missingSubscriptionRecord.length} usuário(s).\n`);
    }

    if (totalFixed === 0) {
      console.log("✅ Nenhum usuário para corrigir. Todos com plano e registro em subscriptions.\n");
    } else {
      console.log(`📊 Total: ${totalFixed} alteração(ões).\n`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && (err as { cause?: unknown }).cause;
    console.error("❌ Erro:", msg);
    if (cause) console.error("   Causa:", cause);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();

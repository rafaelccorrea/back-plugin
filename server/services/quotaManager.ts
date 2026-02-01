import { eq, and } from "drizzle-orm";
import { getDb, getActiveUserPlan } from "../db";
import { usageTracking } from "../../drizzle/schema";
import { STRIPE_PLANS } from "../../shared/stripe-plans";

/**
 * Obtém o mês atual no formato YYYY-MM.
 * A quota é mensal: ao virar o mês, um novo registro é criado com uso zerado (mais X leads permitidos).
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Obtém ou cria registro de uso do mês atual.
 * Cada mês tem seu próprio contador; ao mudar o mês, o uso recomeça do zero.
 */
export async function getOrCreateUsageRecord(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const month = getCurrentMonth();

  try {
    const existing = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Criar novo registro
    const newRecord = await db.insert(usageTracking).values({
      userId,
      month,
      leadsCreated: 0,
      apiCallsMade: 0,
    });

    return {
      id: newRecord[0],
      userId,
      month,
      leadsCreated: 0,
      apiCallsMade: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("[Quota] Failed to get or create usage record:", error);
    throw error;
  }
}

/**
 * Incrementa contador de leads criados
 */
export async function incrementLeadsUsage(userId: number, count: number = 1) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const usage = await getOrCreateUsageRecord(userId);

    await db
      .update(usageTracking)
      .set({
        leadsCreated: (usage.leadsCreated || 0) + count,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.month, getCurrentMonth())
        )
      );

    return true;
  } catch (error) {
    console.error("[Quota] Failed to increment leads usage:", error);
    throw error;
  }
}

/**
 * Zera o uso do mês atual (leads e API calls).
 * Chamar ao trocar de plano (upgrade ou downgrade) para que o usuário tenha a cota do novo plano no mês.
 * Ex.: estava no Starter (50 leads, usou 50), fez downgrade para Free (10 leads) → zera uso → pode usar 10 leads no resto do mês.
 */
export async function resetCurrentMonthUsage(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const month = getCurrentMonth();

  try {
    const existing = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(usageTracking)
        .set({
          leadsCreated: 0,
          apiCallsMade: 0,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(usageTracking.userId, userId),
            eq(usageTracking.month, month)
          )
        );
    } else {
      await db.insert(usageTracking).values({
        userId,
        month,
        leadsCreated: 0,
        apiCallsMade: 0,
      });
    }
    return true;
  } catch (error) {
    console.error("[Quota] Failed to reset current month usage:", error);
    throw error;
  }
}

/**
 * Incrementa contador de chamadas de API
 */
export async function incrementApiCallsUsage(userId: number, count: number = 1) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const usage = await getOrCreateUsageRecord(userId);

    await db
      .update(usageTracking)
      .set({
        apiCallsMade: (usage.apiCallsMade || 0) + count,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.month, getCurrentMonth())
        )
      );

    return true;
  } catch (error) {
    console.error("[Quota] Failed to increment API calls usage:", error);
    throw error;
  }
}

/**
 * Obtém informações de quota do usuário
 */
export async function getUserQuotaInfo(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const planFromSubscription = await getActiveUserPlan(userId);
    const planKey = ((planFromSubscription ?? "free") as string).toUpperCase() as keyof typeof STRIPE_PLANS;
    const plan: (typeof STRIPE_PLANS)[keyof typeof STRIPE_PLANS] =
      STRIPE_PLANS[planKey] ?? STRIPE_PLANS.FREE;

    // Obter uso do mês atual (registro único por userId + mês; novo mês = novo registro = 0)
    const usage = await getOrCreateUsageRecord(userId);

    // Calcular percentuais
    const leadsUsagePercent =
      (plan.monthlyLeadsQuota as number) === 999999
        ? 0
        : ((usage.leadsCreated || 0) / (plan.monthlyLeadsQuota as number)) * 100;

    const apiCallsUsagePercent =
      ((usage.apiCallsMade || 0) / (plan.monthlyApiCalls as number)) * 100;

    // Verificar se excedeu quota
    const leadsExceeded = (usage.leadsCreated || 0) > (plan.monthlyLeadsQuota as number) && (plan.monthlyLeadsQuota as number) !== 999999;
    const apiCallsExceeded = (usage.apiCallsMade || 0) > (plan.monthlyApiCalls as number);

    return {
      plan,
      usage: {
        leadsCreated: usage.leadsCreated,
        apiCallsMade: usage.apiCallsMade,
        month: usage.month,
      },
      quotas: {
      leads: {
        used: usage.leadsCreated || 0,
        limit: plan.monthlyLeadsQuota as number,
        percent: leadsUsagePercent,
        exceeded: leadsExceeded,
        remaining: Math.max(0, (plan.monthlyLeadsQuota as number) - (usage.leadsCreated || 0)),
      },
      apiCalls: {
        used: usage.apiCallsMade || 0,
        limit: plan.monthlyApiCalls as number,
        percent: apiCallsUsagePercent,
        exceeded: apiCallsExceeded,
        remaining: Math.max(0, (plan.monthlyApiCalls as number) - (usage.apiCallsMade || 0)),
      },
      },
      warnings: {
        leadsWarning: leadsUsagePercent >= 80 && !leadsExceeded,
        apiCallsWarning: apiCallsUsagePercent >= 80 && !apiCallsExceeded,
        leadsExceeded,
        apiCallsExceeded,
      },
    };
  } catch (error) {
    console.error("[Quota] Failed to get user quota info:", error);
    throw error;
  }
}

/**
 * Valida se usuário pode fazer uma ação (criar lead ou fazer chamada de API)
 */
export async function validateQuota(
  userId: number,
  action: "lead" | "api_call"
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const quotaInfo = await getUserQuotaInfo(userId);

    if (action === "lead") {
      if (quotaInfo.quotas.leads.exceeded) {
        return {
          allowed: false,
          reason: `Você atingiu o limite de ${quotaInfo.quotas.leads.limit || 'ilimitado'} leads para este mês`,
        };
      }
    } else if (action === "api_call") {
      if (quotaInfo.quotas.apiCalls.exceeded) {
        return {
          allowed: false,
          reason: `Você atingiu o limite de ${quotaInfo.quotas.apiCalls.limit || 'ilimitado'} chamadas de API para este mês`,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("[Quota] Failed to validate quota:", error);
    // Em caso de erro, permitir a ação (fail open)
    return { allowed: true };
  }
}

/**
 * Sincroniza subscription do Stripe com banco de dados
 */
export async function syncStripeSubscription(
  userId: number,
  _stripeSubscriptionId: string,
  _stripePriceId: string
) {
  try {
    // Tabela subscriptions é atualizada pelo webhook/stripe-sync. Aqui só zeramos uso ao trocar de plano.
    await resetCurrentMonthUsage(userId);
    return true;
  } catch (error) {
    console.error("[Quota] Failed to sync Stripe subscription:", error);
    throw error;
  }
}

/**
 * Reseta quotas quando subscription é cancelada
 */
export async function handleSubscriptionCanceled(userId: number) {
  try {
    // Plano/status ficam na tabela subscriptions (webhook já atualiza). Só zerar uso do mês.
    await resetCurrentMonthUsage(userId);
    return true;
  } catch (error) {
    console.error("[Quota] Failed to handle subscription canceled:", error);
    throw error;
  }
}

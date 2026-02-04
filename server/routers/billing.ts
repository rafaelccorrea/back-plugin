import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getActiveUserPlan, getActiveUserSubscriptionInfo, getUserSubscription, getLatestSubscriptionStatus } from "../db";
import { leads } from "../../drizzle/schema";
import { and, eq, gte } from "drizzle-orm";
import { getUserQuotaInfo } from "../services/quotaManager";

export const billingRouter = router({
  /**
   * Obter informações de plano e subscription do usuário
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        return { success: true, data: null };
      }

      const subInfo = await getActiveUserSubscriptionInfo(ctx.user.id);
      const subscription = await getUserSubscription(ctx.user.id);

      const planId = subInfo?.plan ?? "free";
      const plans: Record<string, { id: string; name: string; description: string; monthlyLeadsQuota: number; monthlyApiCalls: number; priceInCents: number; currency: string; features: string[] }> = {
        free: {
          id: "free",
          name: "Gratis",
          description: "Plano gratuito",
          monthlyLeadsQuota: 10,
          monthlyApiCalls: 100,
          priceInCents: 0,
          currency: "USD",
          features: ["Até 10 leads por mês", "100 chamadas de API", "Dashboard básico", "Suporte por email"],
        },
        starter: {
          id: "starter",
          name: "Starter",
          description: "Para pequenos corretores",
          monthlyLeadsQuota: 50,
          monthlyApiCalls: 1000,
          priceInCents: 2900,
          currency: "USD",
          features: ["Até 50 leads por mês", "1.000 chamadas de API", "Dashboard completo", "Respostas sugeridas por IA", "Suporte por email"],
        },
        professional: {
          id: "professional",
          name: "Professional",
          description: "Plano profissional",
          monthlyLeadsQuota: 500,
          monthlyApiCalls: 10000,
          priceInCents: 7900,
          currency: "USD",
          features: ["Até 500 leads por mês", "10.000 chamadas de API", "Dashboard completo", "Respostas sugeridas por IA", "Prioridade de suporte", "Relatórios avançados", "API documentation"],
        },
        enterprise: {
          id: "enterprise",
          name: "Enterprise",
          description: "Plano empresarial",
          monthlyLeadsQuota: 999999,
          monthlyApiCalls: 50000,
          priceInCents: 19900,
          currency: "USD",
          features: ["Leads ilimitados", "50.000 chamadas de API", "Dashboard completo", "Respostas sugeridas por IA", "Suporte dedicado 24/7", "Relatórios avançados", "API documentation", "Integração customizada", "SLA garantido"],
        },
      };
      const plan = plans[planId] || plans.free;
      const sub = subscription?.subscription;
      const periodStart = sub?.currentPeriodStart ? new Date(sub.currentPeriodStart).toISOString() : new Date().toISOString();
      const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      let subscriptionStatus = subInfo?.status ?? null;
      if (!subscriptionStatus && !subInfo) {
        const latestStatus = await getLatestSubscriptionStatus(ctx.user.id);
        if (latestStatus) subscriptionStatus = latestStatus;
      }

      return {
        success: true,
        data: {
          planId: plan.id,
          planName: plan.name,
          planDescription: plan.description,
          monthlyLeadsQuota: plan.monthlyLeadsQuota,
          monthlyApiCalls: plan.monthlyApiCalls,
          priceInCents: plan.priceInCents,
          currency: plan.currency,
          features: plan.features,
          subscriptionStatus: subscriptionStatus ?? (subInfo ? "active" : null),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      };
    } catch (error) {
      console.error("[Billing] Error getting subscription:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get subscription information",
        cause: error,
      });
    }
  }),

  /**
   * Obter uso do mês atual e limites (quota mensal: ao virar o mês o contador zera).
   */
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    try {
      const quotaInfo = await getUserQuotaInfo(ctx.user.id);
      return {
        success: true,
        data: {
          leadsCreated: quotaInfo.usage.leadsCreated ?? 0,
          leadsQuota: quotaInfo.quotas.leads.limit,
          leadsUsagePercent: quotaInfo.quotas.leads.percent,
          apiCallsMade: quotaInfo.usage.apiCallsMade ?? 0,
          apiCallsQuota: quotaInfo.quotas.apiCalls.limit,
          apiCallsUsagePercent: quotaInfo.quotas.apiCalls.percent,
        },
      };
    } catch (error) {
      console.error("[Billing] Error getting usage:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get usage information",
        cause: error,
      });
    }
  }),

  /**
   * Verificar se o usuário atingiu o limite de quotas
   */
  checkQuotaLimits: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const planId = (await getActiveUserPlan(ctx.user.id)) ?? "free";
      const plans: Record<string, any> = {
        free: { monthlyLeadsQuota: 10, monthlyApiCalls: 100 },
        starter: { monthlyLeadsQuota: 50, monthlyApiCalls: 1000 },
        professional: { monthlyLeadsQuota: 500, monthlyApiCalls: 10000 },
        enterprise: { monthlyLeadsQuota: 999999, monthlyApiCalls: 50000 },
      };
      const plan = plans[planId] || plans.free;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const leadsCreatedResult = await db
        .select()
        .from(leads)
        .where(and(eq(leads.userId, ctx.user.id), gte(leads.createdAt, monthStart)));
      const leadsCreated = leadsCreatedResult.length;
      const leadsLimitReached = leadsCreated >= plan.monthlyLeadsQuota;

      return {
        success: true,
        data: {
          leadsLimitReached,
          leadsCreated,
          leadsQuota: plan.monthlyLeadsQuota,
          apiCallsLimitReached: false,
          apiCallsMade: 0,
          apiCallsQuota: plan.monthlyApiCalls,
        },
      };
    } catch (error) {
      console.error("[Billing] Error checking quota limits:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check quota limits",
        cause: error,
      });
    }
  }),
});

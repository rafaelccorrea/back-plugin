import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { getDb, getActiveUserSubscriptionInfo } from "../db";
import { users, subscriptions, plans } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getPlanByPriceId } from "../../shared/stripe-plans";
import { resetCurrentMonthUsage } from "../services/quotaManager";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

export const stripeSyncRouter = router({
  /**
   * Sincronizar assinatura do usuário com Stripe
   */
  syncSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.user.stripeCustomerId) {
        return {
          success: true,
          message: "Usuário não tem customer ID no Stripe",
          data: null,
        };
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      // Buscar subscriptions ativas do cliente
      const subscriptions = await stripe.subscriptions.list({
        customer: ctx.user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        // Nenhuma subscription ativa: só limpar stripeSubscriptionId em users; plano vem de subscriptions
        await db
          .update(users)
          .set({ stripeSubscriptionId: null })
          .where(eq(users.id, ctx.user.id));

        await resetCurrentMonthUsage(ctx.user.id);

        return {
          success: true,
          message: "Nenhuma subscription ativa encontrada",
          data: null,
        };
      }

      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0]?.price.id;
      const planInfo = priceId ? getPlanByPriceId(priceId) : null;

      if (!planInfo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plano não encontrado",
        });
      }

      await db
        .update(users)
        .set({
          plan: planInfo.id.toLowerCase() as any,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status as any,
        })
        .where(eq(users.id, ctx.user.id));

      if (priceId) {
        const planRows = await db.select({ id: plans.id }).from(plans).where(eq(plans.stripePriceId, priceId)).limit(1);
        if (planRows.length > 0) {
          const planPk = planRows[0].id;
          const periodStart = new Date((subscription.current_period_start ?? 0) * 1000);
          const periodEnd = new Date((subscription.current_period_end ?? 0) * 1000);
          const existing = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, subscription.id)).limit(1);
          if (existing.length > 0) {
            await db.update(subscriptions).set({ planId: planPk, status: (subscription.status as any) ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, updatedAt: new Date() }).where(eq(subscriptions.id, existing[0].id));
          } else {
            await db.insert(subscriptions).values({ userId: ctx.user.id, planId: planPk, stripeSubscriptionId: subscription.id, status: (subscription.status as any) ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd });
          }
        }
      }

      await resetCurrentMonthUsage(ctx.user.id);

      return {
        success: true,
        message: "Subscription sincronizada com sucesso",
        data: {
          plan: planInfo.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      };
    } catch (error) {
      console.error("[Stripe Sync] Error syncing subscription:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao sincronizar subscription",
      });
    }
  }),

  /**
   * Verificar status de pagamento
   */
  checkPaymentStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user.stripeCustomerId) {
        return {
          success: true,
          data: {
            status: "no_customer",
            message: "Usuário não tem customer ID no Stripe",
          },
        };
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      // Buscar invoices recentes
      const invoices = await stripe.invoices.list({
        customer: ctx.user.stripeCustomerId,
        limit: 5,
      });

      const { users: usersTable } = await db.schema();
      const userRecord = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, ctx.user.id));

      if (!userRecord.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      const user = userRecord[0];
      const subInfo = await getActiveUserSubscriptionInfo(user.id);

      return {
        success: true,
        data: {
          currentPlan: subInfo?.plan ?? "free",
          subscriptionStatus: subInfo?.status ?? null,
          stripeCustomerId: ctx.user.stripeCustomerId,
          recentInvoices: invoices.data.map((invoice) => ({
            id: invoice.id,
            amount: invoice.amount_paid,
            status: invoice.status,
            date: new Date(invoice.created * 1000),
            url: invoice.hosted_invoice_url,
          })),
        },
      };
    } catch (error) {
      console.error("[Stripe] Error checking payment status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao verificar status de pagamento",
      });
    }
  }),

  /**
   * Sincronizar todos os usuários com Stripe (apenas admin)
   */
  syncAllUsers: adminProcedure.mutation(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      const allUsers = await db.select().from(users);

      let syncedCount = 0;
      let errorCount = 0;

      for (const user of allUsers) {
        try {
          if (!user.stripeCustomerId) {
            continue;
          }

          // Buscar subscriptions ativas
          const subsList = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: "active",
            limit: 1,
          });

          if (subsList.data.length > 0) {
            const subscription = subsList.data[0];
            const priceId = subscription.items.data[0]?.price.id;
            const planInfo = priceId ? getPlanByPriceId(priceId) : null;

            if (planInfo && priceId) {
              await db
                .update(users)
                .set({ stripeSubscriptionId: subscription.id })
                .where(eq(users.id, user.id));

              const planRows = await db.select({ id: plans.id }).from(plans).where(eq(plans.stripePriceId, priceId)).limit(1);
              if (planRows.length > 0) {
                const planPk = planRows[0].id;
                const periodStart = new Date((subscription.current_period_start ?? 0) * 1000);
                const periodEnd = new Date((subscription.current_period_end ?? 0) * 1000);
                const existing = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, subscription.id)).limit(1);
                if (existing.length > 0) {
                  await db.update(subscriptions).set({ planId: planPk, status: (subscription.status as any) ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, updatedAt: new Date() }).where(eq(subscriptions.id, existing[0].id));
                } else {
                  await db.insert(subscriptions).values({ userId: user.id, planId: planPk, stripeSubscriptionId: subscription.id, status: (subscription.status as any) ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd });
                }
              }

              await resetCurrentMonthUsage(user.id);
              syncedCount++;
            }
          } else {
            // Nenhuma subscription ativa
            await db
              .update(users)
              .set({ stripeSubscriptionId: null })
              .where(eq(users.id, user.id));

            await resetCurrentMonthUsage(user.id);
            syncedCount++;
          }
        } catch (error) {
          console.error(`[Stripe Sync] Error syncing user ${user.id}:`, error);
          errorCount++;
        }
      }

      return {
        success: true,
        message: `Sincronização concluída: ${syncedCount} usuários sincronizados, ${errorCount} erros`,
        data: {
          syncedCount,
          errorCount,
          totalUsers: allUsers.length,
        },
      };
    } catch (error) {
      console.error("[Stripe Sync] Error syncing all users:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao sincronizar usuários",
      });
    }
  }),

  /**
   * Obter histórico de pagamentos
   */
  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user.stripeCustomerId) {
        return {
          success: true,
          data: [],
        };
      }

      // Buscar charges do cliente
      const charges = await stripe.charges.list({
        customer: ctx.user.stripeCustomerId,
        limit: 20,
      });

      return {
        success: true,
        data: charges.data.map((charge) => ({
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          date: new Date(charge.created * 1000),
          description: charge.description,
          refunded: charge.refunded,
          refundedAmount: charge.amount_refunded,
        })),
      };
    } catch (error) {
      console.error("[Stripe] Error getting payment history:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao obter histórico de pagamentos",
      });
    }
  }),
});

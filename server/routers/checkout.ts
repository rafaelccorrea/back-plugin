import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createCheckoutSession,
  getCustomerBillingInfo,
  createStripeCustomer,
  getStripeCustomerByEmail,
  updateSubscription,
  cancelSubscription,
  createBillingPortalSession,
} from "../services/stripe";
import { STRIPE_PLANS, getPlanByPriceId } from "../../shared/stripe-plans";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../db";

export const checkoutRouter = router({
  /**
   * Criar sessão de checkout para um plano
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planId: z.enum(["starter", "professional", "enterprise"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const plan = STRIPE_PLANS[input.planId.toUpperCase() as keyof typeof STRIPE_PLANS];

        if (!plan || !plan.priceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plano inválido",
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Banco de dados indisponível",
          });
        }

        // Buscar ou criar customer no Stripe
        let stripeCustomerId: string | undefined = ctx.user.stripeCustomerId || undefined;

        if (!stripeCustomerId) {
          const customer = await createStripeCustomer({
            email: ctx.user.email || "",
            name: ctx.user.name || undefined,
            metadata: {
              userId: ctx.user.id.toString(),
            },
          });

          stripeCustomerId = customer.id as string;

          await db.update(users).set({ stripeCustomerId }).where(eq(users.id, ctx.user.id));
        }

        // Criar sessão de checkout
        const session = await createCheckoutSession({
          customerId: stripeCustomerId || undefined,
          priceId: plan.priceId,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          userId: ctx.user.id,
        });

        await db.update(users).set({ stripeCustomerId }).where(eq(users.id, ctx.user.id));

        return {
          success: true,
          data: {
            sessionId: session.id,
            url: session.url,
          },
        };
      } catch (error) {
        console.error("[Checkout] Failed to create checkout session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao criar sessão de checkout",
        });
      }
    }),

  /**
   * Obter informações de billing do usuário
   */
  getBillingInfo: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user.stripeCustomerId) {
        return {
          success: true,
          data: {
            customer: null,
            subscriptions: [],
            activeSubscription: null,
            plan: STRIPE_PLANS.FREE,
          },
        };
      }

      const billingInfo = await getCustomerBillingInfo(
        ctx.user.stripeCustomerId
      );

      return {
        success: true,
        data: billingInfo,
      };
    } catch (error) {
      console.error("[Checkout] Failed to get billing info:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao obter informações de billing",
      });
    }
  }),

  /**
   * Atualizar subscription para um novo plano
   */
  updateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        newPlanId: z.enum(["starter", "professional", "enterprise"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const plan = STRIPE_PLANS[input.newPlanId.toUpperCase() as keyof typeof STRIPE_PLANS];

        if (!plan || !plan.priceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plano inválido",
          });
        }

        const updatedSubscription = await updateSubscription(
          input.subscriptionId,
          plan.priceId
        );

        return {
          success: true,
          data: {
            subscriptionId: updatedSubscription.id,
            status: updatedSubscription.status,
            plan: plan,
          },
        };
      } catch (error) {
        console.error("[Checkout] Failed to update subscription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao atualizar subscription",
        });
      }
    }),

  /**
   * Cancelar subscription
   */
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const canceledSubscription = await cancelSubscription(
          input.subscriptionId
        );

        return {
          success: true,
          data: {
            subscriptionId: canceledSubscription.id,
            status: canceledSubscription.status,
            canceledAt: canceledSubscription.canceled_at,
          },
        };
      } catch (error) {
        console.error("[Checkout] Failed to cancel subscription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao cancelar subscription",
        });
      }
    }),

  /**
   * Criar sessão do portal de billing
   */
  createBillingPortalSession: protectedProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user.stripeCustomerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Usuário não tem customer Stripe",
          });
        }

        const session = await createBillingPortalSession(
          ctx.user.stripeCustomerId,
          input.returnUrl
        );

        return {
          success: true,
          data: {
            url: session.url,
          },
        };
      } catch (error) {
        console.error("[Checkout] Failed to create billing portal session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao criar sessão do portal de billing",
        });
      }
    }),

  /**
   * Listar planos disponíveis
   */
  listPlans: publicProcedure.query(() => {
    return {
      success: true,
      data: Object.values(STRIPE_PLANS),
    };
  }),
});

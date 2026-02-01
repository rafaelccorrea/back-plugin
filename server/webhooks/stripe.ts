import Stripe from "stripe";
import { verifyWebhookSignature } from "../services/stripe";
import { getDb } from "../db";
import { users, subscriptions, plans } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getPlanByPriceId } from "../../shared/stripe-plans";
import { resetCurrentMonthUsage } from "../services/quotaManager";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

export interface WebhookHandlerParams {
  body: string;
  signature: string;
}

/**
 * Processa webhooks do Stripe
 */
export async function handleStripeWebhook(params: WebhookHandlerParams) {
  try {
    const event = verifyWebhookSignature(
      params.body,
      params.signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error("[Stripe Webhook] Error processing webhook:", error);
    throw error;
  }
}

/**
 * Quando uma subscription é criada
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Stripe] Database not available");
      return;
    }

    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? getPlanByPriceId(priceId) : null;

    console.log(
      `[Stripe] Subscription created: ${subscription.id} for customer ${customerId}, plan: ${plan?.name}`
    );

    const validStatus = subscription.status as "active" | "past_due" | "canceled" | "unpaid" | null;
    const planId = plan?.id ? (plan.id as "starter" | "professional" | "enterprise") : "free";

    await db
      .update(users)
      .set({
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: validStatus,
        plan: planId,
      })
      .where(eq(users.stripeCustomerId, customerId));

    const userRows = await db.select({ id: users.id }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
    if (userRows.length > 0 && priceId) {
      const planRows = await db.select({ id: plans.id }).from(plans).where(eq(plans.stripePriceId, priceId)).limit(1);
      if (planRows.length > 0) {
        const userId = userRows[0].id;
        const planPk = planRows[0].id;
        const periodStart = new Date((subscription.current_period_start ?? 0) * 1000);
        const periodEnd = new Date((subscription.current_period_end ?? 0) * 1000);
        const existing = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, subscription.id)).limit(1);
        if (existing.length > 0) {
          await db.update(subscriptions).set({ planId: planPk, status: validStatus ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, updatedAt: new Date() }).where(eq(subscriptions.id, existing[0].id));
        } else {
          await db.insert(subscriptions).values({ userId, planId: planPk, stripeSubscriptionId: subscription.id, status: validStatus ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd });
        }
      }
    }

    console.log(`[Stripe] User and subscriptions table updated (plan: ${planId})`);
  } catch (error) {
    console.error("[Stripe] Error handling subscription.created:", error);
    throw error;
  }
}

/**
 * Quando uma subscription é atualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Stripe] Database not available");
      return;
    }

    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? getPlanByPriceId(priceId) : null;

    console.log(
      `[Stripe] Subscription updated: ${subscription.id}, status: ${subscription.status}, plan: ${plan?.name}`
    );

    const validStatus = subscription.status as "active" | "past_due" | "canceled" | "unpaid" | null;

    await db
      .update(users)
      .set({ stripeSubscriptionId: subscription.id })
      .where(eq(users.stripeCustomerId, customerId));

    const userRows = await db.select({ id: users.id }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
    if (userRows.length > 0 && priceId) {
      const planRows = await db.select({ id: plans.id }).from(plans).where(eq(plans.stripePriceId, priceId)).limit(1);
      if (planRows.length > 0) {
        const userId = userRows[0].id;
        const planPk = planRows[0].id;
        const periodStart = new Date((subscription.current_period_start ?? 0) * 1000);
        const periodEnd = new Date((subscription.current_period_end ?? 0) * 1000);
        const existing = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, subscription.id)).limit(1);
        if (existing.length > 0) {
          await db.update(subscriptions).set({ planId: planPk, status: validStatus ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, updatedAt: new Date() }).where(eq(subscriptions.id, existing[0].id));
        } else {
          await db.insert(subscriptions).values({ userId, planId: planPk, stripeSubscriptionId: subscription.id, status: validStatus ?? "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd });
        }
      }
    }

    console.log(`[Stripe] Subscriptions table updated (plan from price)`);
  } catch (error) {
    console.error("[Stripe] Error handling subscription.updated:", error);
    throw error;
  }
}

/**
 * Quando uma subscription é cancelada (downgrade/cancelamento)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Stripe] Database not available");
      return;
    }

    const customerId = subscription.customer as string;

    console.log(`[Stripe] Subscription deleted: ${subscription.id}`);

    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    await db
      .update(users)
      .set({ stripeSubscriptionId: null })
      .where(eq(users.stripeCustomerId, customerId));

    await db.update(subscriptions).set({ status: "canceled", updatedAt: new Date() }).where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    if (userRows.length > 0) {
      await resetCurrentMonthUsage(userRows[0].id);
    }

    console.log(`[Stripe] User and subscriptions table: subscription canceled, plan set to free, usage reset`);
  } catch (error) {
    console.error("[Stripe] Error handling subscription.deleted:", error);
    throw error;
  }
}

/**
 * Quando um pagamento de invoice é bem-sucedido
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Stripe] Database not available");
      return;
    }

    const customerId = invoice.customer as string;

    console.log(
      `[Stripe] Invoice payment succeeded: ${invoice.id}, amount: ${invoice.amount_paid}, customer: ${customerId}`
    );

    // Buscar subscription do invoice
    const subscriptionId = (invoice as any).subscription as string | null;
    if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Atualizar status da subscription na tabela subscriptions
      const validStatus = subscription.status as "active" | "past_due" | "canceled" | "unpaid" | null;
      await db.update(subscriptions).set({ status: validStatus ?? "active", updatedAt: new Date() }).where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      console.log(`[Stripe] Subscription status updated after payment`);
    }
  } catch (error) {
    console.error("[Stripe] Error handling invoice.payment_succeeded:", error);
    throw error;
  }
}

/**
 * Quando um pagamento de invoice falha
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Stripe] Database not available");
      return;
    }

    const customerId = invoice.customer as string;

    console.log(
      `[Stripe] Invoice payment failed: ${invoice.id}, amount: ${invoice.amount_due}, customer: ${customerId}`
    );

    // Registrar falha de pagamento - apenas registrar o evento
    console.log(`[Stripe] Payment failed for invoice ${invoice.id}, customer will be notified`);
    // Não cancelamos a subscription aqui, apenas registramos a falha
    // O Stripe vai tentar cobrar novamente automaticamente
  } catch (error) {
    console.error("[Stripe] Error handling invoice.payment_failed:", error);
    throw error;
  }
}

/**
 * Quando um charge é reembolsado
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Stripe] Database not available");
      return;
    }

    console.log(
      `[Stripe] Charge refunded: ${charge.id}, amount: ${charge.amount_refunded}`
    );

    // Se o charge foi totalmente reembolsado, cancelar a subscription
    if (charge.refunded && charge.amount_refunded === charge.amount) {
      if (charge.customer) {
        const customerId = charge.customer as string;

        // Buscar subscriptions ativas do cliente
        if (!process.env.STRIPE_SECRET_KEY) {
          console.warn("[Stripe] STRIPE_SECRET_KEY not configured");
          return;
        }
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0 && process.env.STRIPE_SECRET_KEY) {
          // Cancelar subscription
          await stripe.subscriptions.cancel(subscriptions.data[0].id);

          console.log(
            `[Stripe] Subscription canceled due to full refund: ${subscriptions.data[0].id}`
          );
        }
      }
    }
  } catch (error) {
    console.error("[Stripe] Error handling charge.refunded:", error);
    throw error;
  }
}

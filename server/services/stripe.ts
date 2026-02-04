import Stripe from "stripe";
import { STRIPE_PLANS } from "../../shared/stripe-plans";

let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export interface CreateCheckoutSessionParams {
  customerId?: string | null;
  email?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: number;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Cria um novo customer no Stripe
 */
export async function createStripeCustomer(params: CreateCustomerParams) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const customer = await stripeClient.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
    return customer;
  } catch (error) {
    console.error("[Stripe] Failed to create customer:", error);
    throw error;
  }
}

/**
 * Recupera um customer pelo email
 */
export async function getStripeCustomerByEmail(email: string) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const customers = await stripeClient.customers.list({
      email: email,
      limit: 1,
    });
    return customers.data[0] || null;
  } catch (error) {
    console.error("[Stripe] Failed to get customer by email:", error);
    throw error;
  }
}

/**
 * Cria uma sessão de checkout no Stripe
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    let customerId = params.customerId;

    // Se não houver customerId, tenta buscar ou criar um novo
    if (!customerId && params.email) {
      const existingCustomer = await getStripeCustomerByEmail(params.email);
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await createStripeCustomer({
          email: params.email,
          metadata: {
            userId: params.userId.toString(),
          },
        });
        customerId = newCustomer.id;
      }
    }

    const session = await stripeClient.checkout.sessions.create({
      customer: customerId || undefined,
      payment_method_types: ["card"],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId.toString(),
      },
    } as any);

    return session;
  } catch (error) {
    console.error("[Stripe] Failed to create checkout session:", error);
    throw error;
  }
}

/**
 * Recupera uma subscription pelo ID
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("[Stripe] Failed to get subscription:", error);
    throw error;
  }
}

/**
 * Lista subscriptions de um customer
 */
export async function getCustomerSubscriptions(customerId: string) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const subscriptions = await stripeClient.subscriptions.list({
      customer: customerId,
      limit: 100,
    });
    return subscriptions.data;
  } catch (error) {
    console.error("[Stripe] Failed to get customer subscriptions:", error);
    throw error;
  }
}

/**
 * Cancela uma subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const subscription = await stripeClient.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("[Stripe] Failed to cancel subscription:", error);
    throw error;
  }
}

/**
 * Atualiza uma subscription para um novo preço
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);

    const updatedSubscription = await stripeClient.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0]!.id,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
      }
    );

    return updatedSubscription;
  } catch (error) {
    console.error("[Stripe] Failed to update subscription:", error);
    throw error;
  }
}

/**
 * Verifica a assinatura de um webhook do Stripe
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const event = stripeClient.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (error) {
    console.error("[Stripe] Failed to verify webhook signature:", error);
    throw error;
  }
}

/**
 * Recupera informações de billing de um customer
 */
export async function getCustomerBillingInfo(customerId: string) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const customer = await stripeClient.customers.retrieve(customerId);
    const subscriptions = await getCustomerSubscriptions(customerId);

    const activeSubscription = subscriptions.find(
      (sub: Stripe.Subscription) => sub.status === "active"
    );

    if (!activeSubscription) {
      return {
        customer,
        subscriptions,
        activeSubscription: null,
        plan: STRIPE_PLANS.FREE,
      };
    }

    const priceId = (activeSubscription.items.data[0]?.price as Stripe.Price).id;
    const plan = Object.values(STRIPE_PLANS).find(
      (p) => p.priceId === priceId
    );

    return {
      customer,
      subscriptions,
      activeSubscription,
      plan: plan || STRIPE_PLANS.FREE,
    };
  } catch (error) {
    console.error("[Stripe] Failed to get customer billing info:", error);
    throw error;
  }
}

/**
 * Cria um portal de billing para o customer gerenciar sua subscription.
 * Use STRIPE_BILLING_PORTAL_CONFIGURATION_ID no .env com o ID da configuração
 * (ex: bpc_xxx) para usar seu portal configurado no Dashboard do Stripe.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error("Stripe client not initialized");
    }

    const params: { customer: string; return_url: string; configuration?: string } = {
      customer: customerId,
      return_url: returnUrl,
    };
    const configId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
    if (configId) {
      params.configuration = configId;
    }

    const session = await stripeClient.billingPortal.sessions.create(params);
    return session;
  } catch (error) {
    console.error("[Stripe] Failed to create billing portal session:", error);
    throw error;
  }
}

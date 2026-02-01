import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleStripeWebhook } from "./stripe";
import Stripe from "stripe";

// Mock da função de verificação de webhook
vi.mock("../services/stripe", () => ({
  verifyWebhookSignature: vi.fn((body, signature, secret) => {
    // Retornar um evento mock baseado no tipo
    try {
      const data = JSON.parse(body);
      return {
        type: data.type,
        data: data.data,
      };
    } catch {
      throw new Error("Invalid webhook signature");
    }
  }),
}));

// Mock do banco de dados
vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => ({})),
      })),
    })),
  })),
}));

// Mock do Stripe
vi.mock("stripe", () => {
  const mockStripe = {
    subscriptions: {
      retrieve: vi.fn(async () => ({
        id: "sub_test",
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: {
          data: [
            {
              price: {
                id: "price_1Sv9E4Fu6ngAE0TnTInADMKf",
              },
            },
          ],
        },
      })),
      list: vi.fn(async () => ({
        data: [
          {
            id: "sub_test",
            status: "active",
          },
        ],
      })),
      cancel: vi.fn(async () => ({
        id: "sub_test",
        status: "canceled",
      })),
    },
  };
  return {
    default: vi.fn(() => mockStripe),
  };
});

describe("Stripe Webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle subscription.created event", async () => {
    const eventBody = JSON.stringify({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test",
          customer: "cus_test",
          status: "active",
          items: {
            data: [
              {
                price: {
                  id: "price_1Sv9E4Fu6ngAE0TnTInADMKf",
                },
              },
            ],
          },
        },
      },
    });

    const result = await handleStripeWebhook({
      body: eventBody,
      signature: "test_signature",
    });

    expect(result).toEqual({ received: true });
  });

  it("should handle subscription.updated event", async () => {
    const eventBody = JSON.stringify({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test",
          customer: "cus_test",
          status: "active",
          items: {
            data: [
              {
                price: {
                  id: "price_1Sv9ECFu6ngAE0TnxiJdxvie",
                },
              },
            ],
          },
        },
      },
    });

    const result = await handleStripeWebhook({
      body: eventBody,
      signature: "test_signature",
    });

    expect(result).toEqual({ received: true });
  });

  it("should handle subscription.deleted event", async () => {
    const eventBody = JSON.stringify({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test",
          customer: "cus_test",
          status: "canceled",
          items: {
            data: [],
          },
        },
      },
    });

    const result = await handleStripeWebhook({
      body: eventBody,
      signature: "test_signature",
    });

    expect(result).toEqual({ received: true });
  });

  it("should handle invoice.payment_succeeded event", async () => {
    const eventBody = JSON.stringify({
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_test",
          customer: "cus_test",
          amount_paid: 2900,
          subscription: "sub_test",
        },
      },
    });

    const result = await handleStripeWebhook({
      body: eventBody,
      signature: "test_signature",
    });

    expect(result).toEqual({ received: true });
  });

  it("should handle invoice.payment_failed event", async () => {
    const eventBody = JSON.stringify({
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_test",
          customer: "cus_test",
          amount_due: 2900,
        },
      },
    });

    const result = await handleStripeWebhook({
      body: eventBody,
      signature: "test_signature",
    });

    expect(result).toEqual({ received: true });
  });

  it("should handle charge.refunded event", async () => {
    const eventBody = JSON.stringify({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test",
          customer: "cus_test",
          amount: 2900,
          amount_refunded: 2900,
          refunded: true,
        },
      },
    });

    const result = await handleStripeWebhook({
      body: eventBody,
      signature: "test_signature",
    });

    expect(result).toEqual({ received: true });
  });

  it("should handle unhandled event types gracefully", async () => {
    const eventBody = JSON.stringify({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test",
        },
      },
    });

    const result = await handleStripeWebhook({
      body: eventBody,
      signature: "test_signature",
    });

    expect(result).toEqual({ received: true });
  });

  it("should throw error on invalid webhook signature", async () => {
    const invalidBody = "invalid json";

    await expect(
      handleStripeWebhook({
        body: invalidBody,
        signature: "invalid_signature",
      })
    ).rejects.toThrow();
  });
});

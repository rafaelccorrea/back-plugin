import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import type { User } from "../../drizzle/schema";

type AuthenticatedUser = User;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    apiKey: "test-api-key",
    stripeCustomerId: null,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("checkout router", () => {
  it("should list all plans", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.checkout.listPlans();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(4);
    expect(result.data[0]?.name).toBe("Gratuito");
  });

  it("should return billing info for free plan when no subscription", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.checkout.getBillingInfo();

    expect(result.success).toBe(true);
    expect(result.data.plan.id).toBe("free");
    expect(result.data.activeSubscription).toBeNull();
  });

  it("should validate plan ID on checkout", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.checkout.createCheckoutSession({
        planId: "invalid" as any,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should require authentication for checkout", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.checkout.createCheckoutSession({
        planId: "starter",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should list all paid plans", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.checkout.listPlans();

    const paidPlans = result.data.filter((p) => p.priceId !== null);
    expect(paidPlans).toHaveLength(3);
    expect(paidPlans[0]?.name).toBe("Starter");
    expect(paidPlans[1]?.name).toBe("Professional");
    expect(paidPlans[2]?.name).toBe("Enterprise");
  });

  it("should have correct pricing for plans", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.checkout.listPlans();

    const starter = result.data.find((p) => p.id === "starter");
    const professional = result.data.find((p) => p.id === "professional");
    const enterprise = result.data.find((p) => p.id === "enterprise");

    expect(starter?.price).toBe(2900); // $29
    expect(professional?.price).toBe(7900); // $79
    expect(enterprise?.price).toBe(19900); // $199
  });

  it("should have correct quotas for plans", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.checkout.listPlans();

    const free = result.data.find((p) => p.id === "free");
    const starter = result.data.find((p) => p.id === "starter");
    const professional = result.data.find((p) => p.id === "professional");
    const enterprise = result.data.find((p) => p.id === "enterprise");

    expect(free?.monthlyLeadsQuota).toBe(10);
    expect(starter?.monthlyLeadsQuota).toBe(50);
    expect(professional?.monthlyLeadsQuota).toBe(500);
    expect(enterprise?.monthlyLeadsQuota).toBe(999999);

    expect(free?.monthlyApiCalls).toBe(100);
    expect(starter?.monthlyApiCalls).toBe(1000);
    expect(professional?.monthlyApiCalls).toBe(10000);
    expect(enterprise?.monthlyApiCalls).toBe(50000);
  });
});

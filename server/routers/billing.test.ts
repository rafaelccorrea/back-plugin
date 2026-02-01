import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    apiKey: "test-api-key",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("billing router", () => {
  describe("getUsage", () => {
    it("should return usage data with correct structure", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.billing.getUsage();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("leadsCreated");
      expect(result.data).toHaveProperty("leadsQuota");
      expect(result.data).toHaveProperty("leadsUsagePercent");
      expect(result.data).toHaveProperty("apiCallsMade");
      expect(result.data).toHaveProperty("apiCallsQuota");
      expect(result.data).toHaveProperty("apiCallsUsagePercent");
    });

    it("should return numeric values for usage", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.billing.getUsage();

      expect(typeof result.data.leadsCreated).toBe("number");
      expect(typeof result.data.leadsQuota).toBe("number");
      expect(typeof result.data.leadsUsagePercent).toBe("number");
      expect(typeof result.data.apiCallsMade).toBe("number");
      expect(typeof result.data.apiCallsQuota).toBe("number");
      expect(typeof result.data.apiCallsUsagePercent).toBe("number");
    });

    it("should return percentage between 0 and 100", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.billing.getUsage();

      expect(result.data.leadsUsagePercent).toBeGreaterThanOrEqual(0);
      expect(result.data.leadsUsagePercent).toBeLessThanOrEqual(100);
      expect(result.data.apiCallsUsagePercent).toBeGreaterThanOrEqual(0);
      expect(result.data.apiCallsUsagePercent).toBeLessThanOrEqual(100);
    });
  });

  describe("checkQuotas", () => {
    it("should check quotas with default values", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.billing.checkQuotas({});

      expect(result.data).toHaveProperty("allowed");
      expect(typeof result.data.allowed).toBe("boolean");
    });

    it("should accept custom lead and API call values", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.billing.checkQuotas({
        leadsToCreate: 5,
        apiCallsToMake: 10,
      });

      expect(result.data).toHaveProperty("allowed");
      expect(typeof result.data.allowed).toBe("boolean");
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("leads router", () => {
  describe("list", () => {
    it("should return empty array when no leads exist", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.leads.list({
        limit: 50,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should respect limit parameter", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.leads.list({
        limit: 10,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getMonthlyUsage", () => {
    it("should return usage data for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.leads.getMonthlyUsage();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("leadsCreated");
      expect(result.data).toHaveProperty("apiCallsMade");
      expect(result.data).toHaveProperty("leadsQuota");
      expect(result.data).toHaveProperty("apiCallsQuota");
    });

    it("should return numeric values", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.leads.getMonthlyUsage();

      expect(typeof result.data.leadsCreated).toBe("number");
      expect(typeof result.data.apiCallsMade).toBe("number");
      expect(typeof result.data.leadsQuota).toBe("number");
      expect(typeof result.data.apiCallsQuota).toBe("number");
    });
  });
});

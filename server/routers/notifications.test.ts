import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("notifications router", () => {
  it("should subscribe to push notifications", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.subscribe({
      endpoint: "https://example.com/push/endpoint",
      auth: "test-auth-key",
      p256dh: "test-p256dh-key",
    });

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("should unsubscribe from push notifications", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.unsubscribe({
      endpoint: "https://example.com/push/endpoint",
    });

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("should get unread notifications", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.getUnread();

    expect(result).toHaveProperty("notifications");
    expect(result).toHaveProperty("count");
    expect(Array.isArray(result.notifications)).toBe(true);
    expect(typeof result.count).toBe("number");
  });

  it("should mark notification as read", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.markAsRead({
      notificationId: 1,
    });

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("should mark all notifications as read", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.markAllAsRead();

    expect(result).toHaveProperty("markedCount");
    expect(typeof result.markedCount).toBe("number");
  });

  it("should send test notification", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.testNotification();

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });
});

import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users, leads } from "../../drizzle/schema";
import { eq, gte, lte, count, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const analyticsRouter = router({
  // Get system overview metrics (admin only)
  getOverview: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const totalUsers = await db.select({ count: count() }).from(users);
      const totalLeads = await db.select({ count: count() }).from(leads);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const newUsersThisMonth = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo));

      const newLeadsThisMonth = await db
        .select({ count: count() })
        .from(leads)
        .where(gte(leads.createdAt, thirtyDaysAgo));

      return {
        totalUsers: totalUsers[0]?.count || 0,
        totalLeads: totalLeads[0]?.count || 0,
        totalConversations: totalLeads[0]?.count || 0,
        newUsersThisMonth: newUsersThisMonth[0]?.count || 0,
        newLeadsThisMonth: newLeadsThisMonth[0]?.count || 0,
        conversionRate: totalLeads[0]?.count ? ((totalLeads[0]?.count || 0) / (totalLeads[0]?.count || 1)) * 100 : 0,
      };
    } catch (error) {
      console.error("Erro ao buscar overview:", error);
      return {
        totalUsers: 0,
        totalLeads: 0,
        totalConversations: 0,
        newUsersThisMonth: 0,
        newLeadsThisMonth: 0,
        conversionRate: 0,
      };
    }
  }),

  // Get user growth data
  getUserGrowth: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        const result = await db
          .select({ count: count() })
          .from(users)
          .where(and(gte(users.createdAt, startOfDay), lte(users.createdAt, endOfDay)));

        data.push({
          date: date.toISOString().split("T")[0],
          users: result[0]?.count || 0,
        });
      }
      return data;
    } catch (error) {
      console.error("Erro ao buscar crescimento de usuários:", error);
      return [];
    }
  }),

  // Get leads by status
  getLeadsByStatus: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const leadData = await db
        .select({ status: leads.status, count: count() })
        .from(leads)
        .groupBy(leads.status);

      // lead_status no banco: new, contacted, qualified, lost, converted
      return {
        novo: leadData.find((l) => l.status === "new")?.count || 0,
        qualificado: leadData.find((l) => l.status === "qualified")?.count || 0,
        convertido: leadData.find((l) => l.status === "converted")?.count || 0,
        perdido: leadData.find((l) => l.status === "lost")?.count || 0,
      };
    } catch (error) {
      console.error("Erro ao buscar leads por status:", error);
      return {
        novo: 0,
        qualificado: 0,
        convertido: 0,
        perdido: 0,
      };
    }
  }),

  // Get user activity
  getUserActivity: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        const result = await db
          .select({ count: count() })
          .from(users)
          .where(and(gte(users.lastSignedIn, startOfDay), lte(users.lastSignedIn, endOfDay)));

        data.push({
          date: date.toISOString().split("T")[0],
          active: result[0]?.count || 0,
        });
      }
      return data;
    } catch (error) {
      console.error("Erro ao buscar atividade de usuários:", error);
      return [];
    }
  }),

  // Get top users by leads
  getTopUsers: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const topUsers = await db
        .select({
          userId: leads.userId,
          leadCount: count(),
          userName: users.name,
          userEmail: users.email,
        })
        .from(leads)
        .leftJoin(users, eq(leads.userId, users.id))
        .groupBy(leads.userId, users.name, users.email)
        .limit(5);

      return topUsers || [];
    } catch (error) {
      console.error("Erro ao buscar top users:", error);
      return [];
    }
  }),

  // Get system health
  getSystemHealth: adminProcedure.query(async () => {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      return {
        uptime: Math.floor(uptime / 60),
        memoryUsageMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        memoryLimitMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        status: "healthy",
      };
    } catch (error) {
      console.error("Erro ao buscar saúde do sistema:", error);
      return {
        uptime: 0,
        memoryUsageMB: 0,
        memoryLimitMB: 0,
        status: "error",
      };
    }
  }),

  // Get user metrics (protected - for user's own data)
  getMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "quarter", "year"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const now = new Date();
        let startDate = new Date();

        switch (input.period) {
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
          case "quarter":
            startDate.setMonth(now.getMonth() - 3);
            break;
          case "year":
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        const userLeads = await db
          .select({
            id: leads.id,
            status: leads.status,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .where(and(eq(leads.userId, ctx.user.id), gte(leads.createdAt, startDate)));

        const totalLeads = userLeads.length;
        // lead_status enum no banco: new, contacted, qualified, lost, converted
        const newLeads = userLeads.filter((l) => l.status === "new").length;
        const contactedLeads = userLeads.filter((l) => l.status === "contacted").length;
        const qualifiedLeads = userLeads.filter((l) => l.status === "qualified").length;
        const convertedLeads = userLeads.filter((l) => l.status === "converted").length;

        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
        const engagementRate =
          totalLeads > 0 ? Math.round(((contactedLeads + qualifiedLeads + convertedLeads) / totalLeads) * 100) : 0;

        return {
          success: true,
          data: {
            metrics: {
              totalLeads,
              newLeads,
              contactedLeads,
              qualifiedLeads,
              convertedLeads,
              conversionRate,
              engagementRate,
            },
            period: input.period,
          },
        };
      } catch (error) {
        console.error("[Analytics] Failed to get metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao buscar métricas",
        });
      }
    }),
});

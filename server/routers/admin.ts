import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, getActiveUserPlan, listUsersForAdmin } from "../db";
import { eq } from "drizzle-orm";
import { users, leads } from "../../drizzle/schema";

export const adminRouter = router({
  /**
   * Listar todos os usuários (apenas admin)
   */
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
        plan: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
        status: z.enum(["active", "inactive", "banned"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const allUsers = await listUsersForAdmin(input.limit * 3, input.offset);
        let filteredUsers = allUsers;
        if (input.search) {
          const searchLower = input.search.toLowerCase();
          filteredUsers = allUsers.filter(
            (u) =>
              u.name?.toLowerCase().includes(searchLower) ||
              u.email?.toLowerCase().includes(searchLower)
          );
        }
        const withPlans = await Promise.all(
          filteredUsers.map(async (u) => {
            const plan = await getActiveUserPlan(u.id);
            return { ...u, plan: plan ?? "free" };
          })
        );
        const byPlan = input.plan ? withPlans.filter((u) => u.plan === input.plan) : withPlans;
        const paginated = byPlan.slice(0, input.limit);

        return {
          success: true,
          data: paginated.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            plan: u.plan,
            isActive: u.isActive ?? true,
            isBanned: u.isBanned ?? false,
            createdAt: u.createdAt,
            lastLogin: u.lastSignedIn ?? null,
            totalLeads: 0,
          })),
          total: byPlan.length,
        };
      } catch (error) {
        console.error("[Admin] Failed to get users:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao buscar usuários",
        });
      }
    }),

  /**
   * Banir usuário (apenas admin)
   */
  banUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Banco de dados indisponível",
          });
        }

        // Verificar se usuário existe
        const user = await db.select().from(users).where(eq(users.id, input.userId));
        if (!user.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        // Banir usuário
        await db.update(users).set({ isBanned: true }).where(eq(users.id, input.userId));

        return {
          success: true,
          message: "Usuário banido com sucesso",
        };
      } catch (error) {
        console.error("[Admin] Failed to ban user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao banir usuário",
        });
      }
    }),

  /**
   * Desbanir usuário (apenas admin)
   */
  unbanUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Banco de dados indisponível",
          });
        }

        const { users } = await db.schema();

        // Desbanir usuário
        await db.update(users).set({ isBanned: false }).where(eq(users.id, input.userId));

        return {
          success: true,
          message: "Usuário desbanido com sucesso",
        };
      } catch (error) {
        console.error("[Admin] Failed to unban user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao desbanir usuário",
        });
      }
    }),

  /**
   * Deletar usuário (apenas admin)
   */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Banco de dados indisponível",
          });
        }

        // Deletar leads do usuário primeiro
        await db.delete(leads).where(eq(leads.userId, input.userId));

        // Deletar usuário
        await db.delete(users).where(eq(users.id, input.userId));

        return {
          success: true,
          message: "Usuário deletado com sucesso",
        };
      } catch (error) {
        console.error("[Admin] Failed to delete user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao deletar usuário",
        });
      }
    }),

  /**
   * Obter estatísticas gerais (apenas admin)
   */
  getStats: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      const totalUsers = await db.select().from(users);
      const totalLeads = await db.select().from(leads);
      const planCounts: Record<string, number> = { free: 0, starter: 0, professional: 0, enterprise: 0 };
      await Promise.all(
        totalUsers.map(async (u: any) => {
          const plan = (await getActiveUserPlan(u.id)) ?? "free";
          planCounts[plan] = (planCounts[plan] || 0) + 1;
        })
      );

      return {
        success: true,
        data: {
          totalUsers: totalUsers.length,
          totalLeads: totalLeads.length,
          planDistribution: planCounts,
          activeUsers: totalUsers.filter((u: any) => u.isActive).length,
          bannedUsers: totalUsers.filter((u: any) => u.isBanned).length,
        },
      };
    } catch (error) {
      console.error("[Admin] Failed to get stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao buscar estatísticas",
      });
    }
  }),
});

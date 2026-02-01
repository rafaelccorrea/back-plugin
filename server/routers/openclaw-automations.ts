import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, getActiveUserPlan } from "../db";
import { openClawAutomations } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const automationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerEvent: z.string(),
  minScore: z.string(),
  actionType: z.string(),
  actionConfig: z.string(),
  executionMode: z.string().optional(), // NOVO
  isActive: z.boolean().default(true),
});

export const openClawAutomationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    console.log("[openClawAutomations.list] userId:", userId);

    const planRaw = (await getActiveUserPlan(userId)) ?? "free";
    const plan = planRaw.toLowerCase();
    console.log("[openClawAutomations.list] plan:", plan);
    if (plan !== "professional" && plan !== "enterprise") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Esta funcionalidade é exclusiva para planos Professional e Enterprise.",
      });
    }

    const db = await getDb();
    if (!db) {
      console.error("[openClawAutomations.list] Database not available");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    try {
      const rows = await db
        .select()
        .from(openClawAutomations)
        .where(eq(openClawAutomations.userId, userId));
      console.log("[openClawAutomations.list] rows count:", rows.length);
      return rows;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      console.error("[openClawAutomations.list] query failed:", { message: msg, code, userId });
      if (err instanceof Error && err.cause) {
        console.error("[openClawAutomations.list] cause:", err.cause);
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao listar automações: ${msg}${code ? ` (${code})` : ""}`,
      });
    }
  }),

  create: protectedProcedure
    .input(automationSchema)
    .mutation(async ({ ctx, input }) => {
      const planRaw = (await getActiveUserPlan(ctx.user.id)) ?? "free";
      const plan = planRaw.toLowerCase();
      if (plan !== "professional" && plan !== "enterprise") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Esta funcionalidade é exclusiva para planos Professional e Enterprise.",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [newAutomation] = await db
        .insert(openClawAutomations)
        .values({
          ...input,
          userId: ctx.user.id,
        })
        .returning();

      return newAutomation;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: automationSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [updated] = await db
        .update(openClawAutomations)
        .set({ ...input.data, updatedAt: new Date() })
        .where(and(
          eq(openClawAutomations.id, input.id),
          eq(openClawAutomations.userId, ctx.user.id)
        ))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .delete(openClawAutomations)
        .where(and(
          eq(openClawAutomations.id, input.id),
          eq(openClawAutomations.userId, ctx.user.id)
        ));

      return { success: true };
    }),
});

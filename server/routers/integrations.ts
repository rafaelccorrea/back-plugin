import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { webhooks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getUserQuotaInfo } from "../services/quotaManager";
import { OUTGOING_EVENTS, type OutgoingEvent } from "../services/outgoingWebhookService";

const EVENTS_SCHEMA = z.array(z.enum(OUTGOING_EVENTS)).min(1, "Selecione pelo menos um evento");

type CtxUser = { id: number; role: string };

function requireUserRole(ctx: { user: CtxUser }) {
  if (ctx.user.role !== "user") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Integrações com webhook estão disponíveis apenas para usuários (tipo user) com plano Professional ou superior.",
    });
  }
}

async function requireProfessionalPlan(ctx: { user: CtxUser }) {
  requireUserRole(ctx);
  const quota = await getUserQuotaInfo(ctx.user.id);
  const planId = quota?.plan?.id ?? "free";
  if (planId !== "professional" && planId !== "enterprise") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Integrações com webhook estão disponíveis apenas para planos Professional e Enterprise.",
    });
  }
}

export const integrationsRouter = router({
  /**
   * Obter configuração de webhook do usuário (apenas planos professional/enterprise).
   */
  getWebhookConfig: protectedProcedure.query(async ({ ctx }) => {
    await requireProfessionalPlan(ctx);
    const db = await getDb();
    if (!db) return { url: null, events: [], isActive: false, lastTriggeredAt: null, failureCount: 0, hasSecret: false };
    try {
      const rows = await db.select().from(webhooks).where(eq(webhooks.userId, ctx.user.id)).limit(1);
      const row = rows[0];
      if (!row) return { url: null, events: [], isActive: false, lastTriggeredAt: null, failureCount: 0, hasSecret: false };
      let eventsList: OutgoingEvent[] = [];
      try {
        eventsList = JSON.parse(row.events) as OutgoingEvent[];
      } catch {
        eventsList = [];
      }
      return {
        url: row.url,
        events: eventsList,
        isActive: row.isActive ?? true,
        lastTriggeredAt: row.lastTriggeredAt,
        failureCount: row.failureCount ?? 0,
        hasSecret: Boolean(row.secret && row.secret.trim()),
      };
    } catch (err) {
      console.error("[Integrations] getWebhookConfig query failed (tabela webhooks pode não existir):", err);
      return { url: null, events: [], isActive: false, lastTriggeredAt: null, failureCount: 0, hasSecret: false };
    }
  }),

  /**
   * Configurar URL e eventos do webhook (apenas planos professional/enterprise).
   * API Key do usuário continua obrigatória para chamadas externas; aqui o usuário está logado.
   */
  setWebhookConfig: protectedProcedure
    .input(
      z.object({
        url: z.string().url("URL inválida").max(2048),
        events: EVENTS_SCHEMA,
        secret: z.string().max(128).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProfessionalPlan(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const eventsJson = JSON.stringify(input.events);
      const secretProvided = input.secret !== undefined;
      const secretValue =
        !secretProvided ? undefined : typeof input.secret === "string" && input.secret.trim() ? input.secret.trim() : null;
      try {
        const existing = await db.select().from(webhooks).where(eq(webhooks.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          const setFields = {
            url: input.url,
            events: eventsJson,
            isActive: true,
            failureCount: 0,
            updatedAt: new Date(),
            ...(secretProvided && { secret: secretValue }),
          };
          await db.update(webhooks).set(setFields).where(eq(webhooks.id, existing[0].id));
        } else {
          await db.insert(webhooks).values({
            userId: ctx.user.id,
            url: input.url,
            events: eventsJson,
            secret: secretValue ?? null,
            isActive: true,
          });
        }
        return { success: true, message: "Webhook configurado com sucesso." };
      } catch (err) {
        console.error("[Integrations] setWebhookConfig failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível salvar o webhook. Se a tabela webhooks não existir, execute as migrations: pnpm db:migrate",
        });
      }
    }),

  /**
   * Desativar webhook (apenas planos professional/enterprise).
   */
  disableWebhook: protectedProcedure.mutation(async ({ ctx }) => {
    await requireProfessionalPlan(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    try {
      await db.update(webhooks).set({ isActive: false, updatedAt: new Date() }).where(eq(webhooks.userId, ctx.user.id));
      return { success: true, message: "Webhook desativado." };
    } catch (err) {
      console.error("[Integrations] disableWebhook failed:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível desativar. Se a tabela webhooks não existir, execute: pnpm db:migrate",
      });
    }
  }),

  /**
   * Verificar se o usuário pode usar integrações (plano professional/enterprise).
   */
  canUseIntegrations: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user.role !== "user") return { allowed: false, planId: "free" };
      const quota = await getUserQuotaInfo(ctx.user.id);
      const planId = quota?.plan?.id ?? "free";
      return { allowed: planId === "professional" || planId === "enterprise", planId };
    } catch {
      return { allowed: false, planId: "free" };
    }
  }),
});

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { automations } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserQuotaInfo } from "../services/quotaManager";

// Limites por plano – alinhados com usePlanLimits no front
const PLAN_MAX_AUTOMATIONS: Record<string, number> = {
  free: 0,
  starter: 5,
  professional: 50,
  enterprise: Number.POSITIVE_INFINITY,
};

// Valores permitidos – 100% alinhados com a tela CreateAutomation (TRIGGERS, ACTIONS, FIELDS, OPERATORS, FIELD_VALUES)
const TRIGGER_IDS = ["novo_lead", "mensagem_recebida", "lead_qualificado", "lead_convertido"] as const;
const ACTION_IDS = ["enviar_mensagem", "qualificar_lead", "enviar_notificacao", "atualizar_status", "criar_tarefa"] as const;
const CONDITION_FIELDS = ["urgencia", "status", "plano", "origem"] as const;
const OPERATOR_IDS = ["igual", "diferente", "contem"] as const;

const FIELD_ALLOWED_VALUES: Record<string, readonly string[]> = {
  urgencia: ["baixa", "media", "alta"],
  status: ["novo", "em_contato", "qualificado", "convertido", "perdido"],
  plano: ["free", "starter", "professional", "enterprise"],
  origem: ["landing_page", "instagram", "facebook", "whatsapp", "manual", "outro"],
};

const conditionSchema = z.object({
  field: z.enum(CONDITION_FIELDS),
  operator: z.enum(OPERATOR_IDS),
  value: z.string().min(1, "Valor obrigatório"),
});

function validateConditionValue(field: string, value: string): boolean {
  const allowed = FIELD_ALLOWED_VALUES[field];
  if (!allowed) return false;
  return allowed.includes(value);
}

const createInput = z.object({
  name: z.string().min(1, "Nome obrigatório").max(255),
  description: z.string().max(2000).optional(),
  trigger: z.enum(TRIGGER_IDS),
  action: z.enum(ACTION_IDS),
  message: z.string().max(5000).optional(),
  conditions: z.array(conditionSchema).default([]),
  isActive: z.boolean().default(true),
});

const updateInput = createInput.partial().extend({
  id: z.number().int().positive(),
});

function isTableMissingError(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? (e as { cause?: Error })?.cause?.message ?? "");
  return /relation ["']?automations["']? does not exist/i.test(msg) || /Failed query/i.test(msg);
}

export const automationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const rows = await db.select().from(automations).where(eq(automations.userId, ctx.user.id)).orderBy(desc(automations.createdAt));
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        description: r.description,
        trigger: r.trigger,
        action: r.action,
        message: r.message ?? undefined,
        conditions: parseConditions(r.conditions),
        isActive: r.isActive ?? true,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    } catch (e) {
      if (isTableMissingError(e)) {
        console.warn("[Automations] Tabela automations não existe. Rode: npm run db:sync ou npm run db:create-automations");
        return [];
      }
      throw e;
    }
  }),

  get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const rows = await db.select().from(automations).where(and(eq(automations.id, input.id), eq(automations.userId, ctx.user.id))).limit(1);
    const row = rows[0];
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Automação não encontrada" });
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      trigger: row.trigger,
      action: row.action,
      message: row.message ?? undefined,
      conditions: parseConditions(row.conditions),
      isActive: row.isActive ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }),

  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const quota = await getUserQuotaInfo(ctx.user.id);
    const planId = (quota?.plan as { id?: string } | undefined)?.id ?? "free";
    const maxAutomations = PLAN_MAX_AUTOMATIONS[planId] ?? 0;
    if (maxAutomations < Number.POSITIVE_INFINITY) {
      const db = await getDb();
      if (db) {
        const count = await db.select().from(automations).where(eq(automations.userId, ctx.user.id));
        if (count.length >= maxAutomations) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Limite de automações do plano atingido (${maxAutomations}). Faça upgrade para criar mais.`,
          });
        }
      }
    }

    for (const c of input.conditions) {
      if (!validateConditionValue(c.field, c.value)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Valor inválido para o campo "${c.field}". Use apenas opções permitidas.`,
        });
      }
    }

    if (input.action === "enviar_mensagem" && (input.message == null || String(input.message).trim() === "")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Mensagem é obrigatória para a ação Enviar Mensagem." });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    try {
      const conditionsJson = JSON.stringify(input.conditions);
      const [inserted] = await db
        .insert(automations)
        .values({
          userId: ctx.user.id,
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          trigger: input.trigger,
          action: input.action,
          message: input.message?.trim() ?? null,
          conditions: conditionsJson,
          isActive: input.isActive ?? true,
        })
        .returning();

      if (!inserted) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao criar automação" });
      return {
        id: inserted.id,
        name: inserted.name,
        trigger: inserted.trigger,
        action: inserted.action,
        isActive: inserted.isActive,
      };
    } catch (e) {
      if (isTableMissingError(e)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Tabela automations não existe. Execute: npm run db:create-automations",
        });
      }
      throw e;
    }
  }),

  update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const { id, ...rest } = input;
    const rows = await db.select().from(automations).where(and(eq(automations.id, id), eq(automations.userId, ctx.user.id))).limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Automação não encontrada" });

    if (rest.conditions != null) {
      for (const c of rest.conditions) {
        if (!validateConditionValue(c.field, c.value)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Valor inválido para o campo "${c.field}". Use apenas opções permitidas.`,
          });
        }
      }
    }
    if (rest.action === "enviar_mensagem" && (rest.message == null || String(rest.message).trim() === "")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Mensagem é obrigatória para a ação Enviar Mensagem." });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (rest.name != null) updateData.name = rest.name.trim();
    if (rest.description !== undefined) updateData.description = rest.description?.trim() ?? null;
    if (rest.trigger != null) updateData.trigger = rest.trigger;
    if (rest.action != null) updateData.action = rest.action;
    if (rest.message !== undefined) updateData.message = rest.message?.trim() ?? null;
    if (rest.conditions != null) updateData.conditions = JSON.stringify(rest.conditions);
    if (rest.isActive !== undefined) updateData.isActive = rest.isActive;

    const [updated] = await db.update(automations).set(updateData).where(and(eq(automations.id, id), eq(automations.userId, ctx.user.id))).returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao atualizar automação" });
    return { id: updated.id, name: updated.name, isActive: updated.isActive };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const rows = await db.delete(automations).where(and(eq(automations.id, input.id), eq(automations.userId, ctx.user.id))).returning({ id: automations.id });
    if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Automação não encontrada" });
    return { id: input.id };
  }),
});

function parseConditions(conditionsJson: string | null): Array<{ field: string; operator: string; value: string }> {
  if (!conditionsJson || conditionsJson.trim() === "") return [];
  try {
    const arr = JSON.parse(conditionsJson);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (c): c is { field: string; operator: string; value: string } =>
        c && typeof c.field === "string" && typeof c.operator === "string" && typeof c.value === "string"
    );
  } catch {
    return [];
  }
}

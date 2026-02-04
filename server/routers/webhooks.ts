import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, createLead, getUserByApiKey } from "../db";
import { leads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { analyzeConversation } from "../services/aiAnalysis";
import * as notificationService from "../services/notificationService";
import { dispatchOutgoingWebhook } from "../services/outgoingWebhookService";
import { validateQuota, incrementLeadsUsage } from "../services/quotaManager";

const ExternalLeadSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  source: z.string().default("external_webhook"),
  notes: z.string().optional(),
  // Opcional: enviar conversa para análise via IA
  conversation: z.string().optional(),
});

/**
 * Limpa a API Key de possíveis aspas ou espaços
 */
function cleanApiKey(key: string): string {
  return key.replace(/['"]+/g, '').trim();
}

export const webhooksRouter = router({
  /**
   * Webhook Universal para Captura de Leads (Zapier, Make, etc.)
   * POST /api/webhooks.externalLead
   */
  externalLead: publicProcedure
    .input(ExternalLeadSchema)
    .mutation(async ({ input }) => {
      try {
        const apiKey = cleanApiKey(input.apiKey);
        const user = await getUserByApiKey(apiKey);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid API Key",
          });
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 1. Usuário já validado acima

        let analysis = null;
        
        // 2. Se houver conversa, analisar com IA
        if (input.conversation && input.conversation.length > 10) {
          analysis = await analyzeConversation(input.conversation, input.name || "Lead Externo");
        }

        // 3. Validar quota mensal antes de criar lead (cota renova todo mês)
        const quotaCheck = await validateQuota(user.id, "lead");
        if (!quotaCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: quotaCheck.reason ?? "Limite de leads do mês atingido. A cota é mensal e renova no próximo mês.",
          });
        }

        // 4. Criar o Lead
        const createResult = await db.insert(leads).values({
          userId: user.id,
          name: input.name || analysis?.name || "Lead Externo",
          phone: input.phone || analysis?.phone || null,
          email: input.email || analysis?.email || null,
          objective: analysis?.objective || "unknown",
          propertyType: analysis?.propertyType || null,
          neighborhood: analysis?.neighborhood || null,
          budget: analysis?.budget || null,
          urgency: analysis?.urgency || "cold",
          score: analysis?.score ? analysis.score.toString() : "0",
          summary: analysis?.summary || input.notes || "Lead capturado via webhook externo",
          suggestedResponse: analysis?.suggestedResponse || null,
          status: "new",
          source: input.source,
          qualificationChecklist: analysis?.qualificationChecklist ? JSON.stringify(analysis.qualificationChecklist) : null,
        }).returning({ id: leads.id });

        const leadId = createResult[0]?.id;

        // Contabilizar uso mensal
        await incrementLeadsUsage(user.id, 1);

        // 5. Notificar Usuário
        await notificationService.notifyNewLead(user.id, {
          name: input.name || analysis?.name || "Novo Lead Externo",
          phone: input.phone || analysis?.phone || "Não informado",
          neighborhood: analysis?.neighborhood || "Não informado",
        });

        // 6. Disparar webhook de integração (apenas planos professional/enterprise)
        void dispatchOutgoingWebhook(user.id, "lead.created", {
          leadId,
          name: input.name || analysis?.name || "Lead Externo",
          phone: (input.phone || analysis?.phone) ?? null,
          email: (input.email || analysis?.email) ?? null,
          source: input.source,
          summary: (analysis?.summary || input.notes) ?? null,
        });

        return {
          success: true,
          message: "Lead captured successfully",
          leadId: leadId
        };
      } catch (error) {
        console.error("[Webhooks] Error capturing external lead:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to capture external lead",
        });
      }
    }),
});

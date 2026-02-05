import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createLead,
  getDb,
  getLeadsByUserId,
  getLeadsByUserIdWithoutFunnelColumns,
  getLeadById,
  getLeadByIdWithoutFunnelColumns,
  updateLead,
  getCurrentMonthUsage,
  getUserSubscription,
  getActiveUserPlan,
  getUserByApiKey,
} from "../db";
import { analyzeConversation, generateWhatsAppReply, type WhatsAppReplyContext } from "../services/aiAnalysis";
import { TRPCError } from "@trpc/server";
import { sanitizeObject } from "../middleware/security";
import * as notificationService from "../services/notificationService";
import { dispatchOutgoingWebhook } from "../services/outgoingWebhookService";
import { processOpenClawAutomations } from "../services/openClawService";
import { validateQuota, incrementLeadsUsage } from "../services/quotaManager";
import { leads } from "../../drizzle/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

const AnalyzePayloadSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  conversation: z.string().min(10, "Conversation must be at least 10 characters"),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

const GenerateReplyPayloadSchema = z.object({
  apiKey: z.string().min(1),
  conversation: z.string().min(1),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  context: z.enum(["new_lead", "reply", "reengagement"]),
});

const UpdateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "lost", "converted"]).optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  objective: z.enum(["buy", "rent", "sell", "unknown"]).optional(),
  propertyType: z.string().optional(),
  neighborhood: z.string().optional(),
  budget: z.string().optional(),
  urgency: z.enum(["cold", "warm", "hot"]).optional(),
  notes: z.string().optional(),
  qualificationChecklist: z.string().optional(),
  nextAction: z.string().optional(),
  expectedCloseAt: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
});

/**
 * Limpa a API Key de possíveis aspas ou espaços
 */
function cleanApiKey(key: string): string {
  return key.replace(/['"]+/g, '').trim();
}

export const leadsRouter = router({
  /**
   * Endpoint público para análise de conversas (usado pela extensão Chrome)
   * POST /api/analyze
   */
  analyze: publicProcedure
    .input(AnalyzePayloadSchema)
    .mutation(async ({ input }) => {
      try {
        // Sanitizar input e limpar API Key
        const sanitized = sanitizeObject(input);
        const apiKey = cleanApiKey(sanitized.apiKey);

        // Buscar usuário pelo API Key (usa getUserByApiKey para compatibilidade com DB sem colunas capture*)
        const user = await getUserByApiKey(apiKey);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid API Key",
          });
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Log extensão (nome/telefone enviados pelo plugin)
        if (sanitized.contactName || sanitized.contactPhone) {
          console.log("[ChatLead API] Extensão enviou:", {
            contactName: sanitized.contactName || "(vazio)",
            contactPhone: sanitized.contactPhone ? "***" + sanitized.contactPhone.slice(-4) : "(vazio)",
          });
        }

        // Analyze conversation with AI
        const analysis = await analyzeConversation(
          sanitized.conversation,
          sanitized.contactName || "Unknown"
        );

        let wasCaptured = false;
        let leadId: number | undefined;

        // FILTRO: Só salva e notifica se for um lead em potencial
        if (analysis.isPotentialLead) {
          // Preferir telefone capturado da extensão (header WhatsApp Web), senão o extraído pela IA
          const rawExt = sanitized.contactPhone?.trim().replace(/\D/g, "") || "";
          const fromExtension = rawExt.length >= 10 && rawExt.length <= 15 ? rawExt : null;
          const phone = fromExtension || analysis.phone || null;
          
          // LÓGICA DE DUPLICADOS: Verificar se já existe um lead aberto com este telefone
          let existingLead = null;
          if (phone) {
            const existingResult = await db.select()
              .from(leads)
              .where(
                and(
                  eq(leads.userId, user.id),
                  eq(leads.phone, phone),
                  inArray(leads.status, ["new", "contacted", "qualified"])
                )
              )
              .orderBy(desc(leads.createdAt))
              .limit(1);
            
            if (existingResult.length > 0) {
              existingLead = existingResult[0];
            }
          }

          if (existingLead) {
            // ATUALIZAÇÃO: lead existente não consome quota (só novo lead conta para o mês)
            leadId = existingLead.id;
            
            // Mesclar checklists (não sobrescrever o que já foi marcado manualmente)
            let finalChecklist = existingLead.qualificationChecklist;
            if (analysis.qualificationChecklist && analysis.qualificationChecklist.length > 0) {
              try {
                const currentList = existingLead.qualificationChecklist ? JSON.parse(existingLead.qualificationChecklist) : [];
                const newList = Array.from(new Set([...currentList, ...analysis.qualificationChecklist]));
                finalChecklist = JSON.stringify(newList);
              } catch (e) {
                finalChecklist = JSON.stringify(analysis.qualificationChecklist);
              }
            }

            await updateLead(leadId, {
              name: analysis.name || existingLead.name,
              objective: analysis.objective || existingLead.objective,
              propertyType: analysis.propertyType || existingLead.propertyType,
              neighborhood: analysis.neighborhood || existingLead.neighborhood,
              budget: analysis.budget || existingLead.budget,
              urgency: analysis.urgency || existingLead.urgency,
              score: analysis.score ? analysis.score.toString() : existingLead.score,
              summary: analysis.summary || existingLead.summary,
              suggestedResponse: analysis.suggestedResponse || existingLead.suggestedResponse,
              qualificationChecklist: finalChecklist,
              updatedAt: new Date(),
            });
            
            wasCaptured = true;
          } else {
            // CRIAÇÃO: Novo lead — validar quota mensal antes de criar
            const quotaCheck = await validateQuota(user.id, "lead");
            if (!quotaCheck.allowed) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: quotaCheck.reason ?? "Limite de leads do mês atingido. A cota é mensal e renova no próximo mês.",
              });
            }
            const createResult = await db.insert(leads).values({
              userId: user.id,
              name: analysis.name || sanitized.contactName || "Lead do WhatsApp",
              phone: phone,
              email: analysis.email || null,
              objective: analysis.objective || "unknown",
              propertyType: analysis.propertyType || null,
              neighborhood: analysis.neighborhood || null,
              budget: analysis.budget || null,
              urgency: analysis.urgency || "cold",
              score: analysis.score ? analysis.score.toString() : "0",
              summary: analysis.summary || null,
              suggestedResponse: analysis.suggestedResponse || null,
              status: "new",
              qualificationChecklist: analysis.qualificationChecklist ? JSON.stringify(analysis.qualificationChecklist) : null,
            }).returning({ id: leads.id });
            
            leadId = createResult[0]?.id;
            wasCaptured = true;

            // Contabilizar uso mensal (quota mensal: ao virar o mês pode criar mais)
            await incrementLeadsUsage(user.id, 1);

            // Notificar usuário apenas para novos leads
            await notificationService.notifyNewLead(user.id, {
              name: analysis.name || sanitized.contactName || "Novo Lead",
              phone: phone || "Não informado",
              neighborhood: analysis.neighborhood || "Não informado",
            });

            // Disparar webhook de integração (apenas planos professional/enterprise)
            void dispatchOutgoingWebhook(user.id, "lead.created", {
              leadId,
              name: analysis.name || sanitized.contactName || null,
              phone: phone ?? null,
              email: analysis.email ?? null,
              summary: analysis.summary ?? null,
              status: "new",
            });

            // Disparar automações do OpenClaw (apenas planos professional/enterprise)
            const userPlan = (await getActiveUserPlan(user.id)) ?? "free";
            if (userPlan === "professional" || userPlan === "enterprise") {
              const fullLeadResult = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
              if (fullLeadResult.length > 0) {
                void processOpenClawAutomations(user.id, "new_lead", fullLeadResult[0]);
              }
            }
          }
        }

        return {
          success: true,
          wasCaptured: wasCaptured,
          leadId: leadId,
          data: sanitizeObject(analysis),
        };
      } catch (error) {
        console.error("[Leads] Error analyzing conversation:", error);
        if (error instanceof TRPCError) throw error;
        const causeMessage = error instanceof Error ? error.message : String(error);
        const isConfigError =
          /GROQ_API_KEY|gsk_|No response from AI|Groq failed/i.test(causeMessage);
        throw new TRPCError({
          code: isConfigError ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message: isConfigError
            ? `Análise de conversa indisponível: ${causeMessage}. Configure GROQ_API_KEY no .env (chave em console.groq.com).`
            : `Failed to analyze conversation: ${causeMessage}`,
        });
      }
    }),

  /**
   * Gera a próxima mensagem para o atendimento pela IA (extensão envia e depois digita no WhatsApp).
   * Disponível para planos professional/enterprise.
   */
  generateReply: publicProcedure
    .input(GenerateReplyPayloadSchema)
    .mutation(async ({ input }) => {
      const sanitized = sanitizeObject(input);
      const apiKey = cleanApiKey(sanitized.apiKey);
      const user = await getUserByApiKey(apiKey);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid API Key" });
      const plan = (await getActiveUserPlan(user.id)) ?? "free";
      if (plan !== "professional" && plan !== "enterprise") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Atendimento pela IA está disponível apenas nos planos Professional e Enterprise.",
        });
      }
      const message = await generateWhatsAppReply(
        sanitized.conversation,
        sanitized.contactName || "Contato",
        sanitized.context as WhatsAppReplyContext,
      );
      return { message };
    }),

  /**
   * Listar leads do usuário autenticado
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const formatExpectedCloseAt = (v: unknown): string | null => {
        if (v == null) return null;
        if (v instanceof Date) return v.toISOString();
        if (typeof v === "string") return v;
        return null;
      };

      const mapLead = (lead: Record<string, unknown> & { id: number; createdAt: Date }) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        objective: lead.objective,
        propertyType: lead.propertyType,
        neighborhood: lead.neighborhood,
        budget: lead.budget,
        urgency: lead.urgency,
        score: lead.score,
        status: lead.status,
        qualificationChecklist: lead.qualificationChecklist,
        nextAction: lead.nextAction ?? null,
        expectedCloseAt: formatExpectedCloseAt(lead.expectedCloseAt),
        createdAt: lead.createdAt,
      });

      try {
        const leadsList = await getLeadsByUserId(
          ctx.user.id,
          input.limit,
          input.offset
        );
        return {
          success: true,
          data: leadsList.map((l) => mapLead(l as Record<string, unknown> & { id: number; createdAt: Date })),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isMissingColumn = /column.*does not exist|nextAction|expectedCloseAt/i.test(msg);
        if (isMissingColumn) {
          try {
            const leadsList = await getLeadsByUserIdWithoutFunnelColumns(
              ctx.user.id,
              input.limit,
              input.offset
            );
            return {
              success: true,
              data: leadsList.map((l) => mapLead({ ...l, nextAction: null, expectedCloseAt: null })),
            };
          } catch (fallbackErr) {
            console.error("[Leads] Error listing leads (fallback):", fallbackErr);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to list leads",
            });
          }
        }
        console.error("[Leads] Error listing leads:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list leads",
        });
      }
    }),

  /**
   * Obter detalhes de um lead específico
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z
          .unknown()
          .transform((v) => {
            if (typeof v === "number" && Number.isFinite(v)) return v;
            if (typeof v === "string") return parseInt(v, 10);
            return NaN;
          })
          .refine((n) => Number.isFinite(n) && n > 0, { message: "Invalid lead id" }),
      })
    )
    .query(async ({ ctx, input }) => {
      const formatExpectedCloseAt = (v: unknown): string | null => {
        if (v == null) return null;
        if (v instanceof Date) return v.toISOString();
        if (typeof v === "string") return v;
        return null;
      };

      let lead: Awaited<ReturnType<typeof getLeadById>> | Awaited<ReturnType<typeof getLeadByIdWithoutFunnelColumns>> | undefined;
      try {
        lead = await getLeadById(input.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/column.*does not exist|nextAction|expectedCloseAt/i.test(msg)) {
          lead = await getLeadByIdWithoutFunnelColumns(input.id);
        } else {
          console.error("[Leads] Error getting lead:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get lead",
          });
        }
      }

      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }

      // Verify ownership
      if (lead.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this lead",
        });
      }

      const row = lead as Record<string, unknown> & { id: number; userId: number; createdAt: Date; updatedAt: Date };
      return {
        success: true,
        data: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          objective: lead.objective,
          propertyType: lead.propertyType,
          neighborhood: lead.neighborhood,
          budget: lead.budget,
          urgency: lead.urgency,
          score: lead.score,
          summary: lead.summary,
          suggestedResponse: lead.suggestedResponse,
          status: lead.status,
          qualificationChecklist: lead.qualificationChecklist,
          nextAction: row.nextAction ?? null,
          expectedCloseAt: formatExpectedCloseAt(row.expectedCloseAt),
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
      };
    }),

  /**
   * Atualizar status de um lead
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        updates: UpdateLeadSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      let lead: Awaited<ReturnType<typeof getLeadById>> | Awaited<ReturnType<typeof getLeadByIdWithoutFunnelColumns>> | undefined;
      try {
        lead = await getLeadById(input.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/column.*does not exist|nextAction|expectedCloseAt/i.test(msg)) {
          lead = await getLeadByIdWithoutFunnelColumns(input.id);
        } else {
          console.error("[Leads] Error getting lead in update:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update lead",
          });
        }
      }

      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }

      if (lead.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this lead",
        });
      }

      const updates = { ...input.updates } as Record<string, unknown>;
      if (updates.expectedCloseAt !== undefined) {
        updates.expectedCloseAt =
          updates.expectedCloseAt === null
            ? null
            : typeof updates.expectedCloseAt === "string"
              ? new Date(updates.expectedCloseAt)
              : updates.expectedCloseAt;
      }

      try {
        await updateLead(input.id, updates as Parameters<typeof updateLead>[1]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/column.*does not exist|nextAction|expectedCloseAt/i.test(msg)) {
          const { nextAction: _na, expectedCloseAt: _ea, ...rest } = updates;
          if (Object.keys(rest).length > 0) {
            await updateLead(input.id, rest as Parameters<typeof updateLead>[1]);
          }
        } else {
          console.error("[Leads] Error updating lead:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update lead",
          });
        }
      }

      let updated: Awaited<ReturnType<typeof getLeadById>> | Awaited<ReturnType<typeof getLeadByIdWithoutFunnelColumns>> | undefined;
      try {
        updated = await getLeadById(input.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/column.*does not exist|nextAction|expectedCloseAt/i.test(msg)) {
          updated = await getLeadByIdWithoutFunnelColumns(input.id);
        } else {
          throw err;
        }
      }

      if (updated) {
        void dispatchOutgoingWebhook(ctx.user.id, "lead.updated", {
          leadId: updated.id,
          name: updated.name ?? null,
          phone: updated.phone ?? null,
          email: updated.email ?? null,
          status: updated.status ?? null,
          summary: updated.summary ?? null,
        });
      }

      return {
        success: true,
        data: updated,
      };
    }),

  /**
   * Obter uso mensal atual
   */
  getMonthlyUsage: protectedProcedure.query(async ({ ctx }) => {
    try {
      const usage = await getCurrentMonthUsage(ctx.user.id);
      const subscription = await getUserSubscription(ctx.user.id);
      const plan = (await getActiveUserPlan(ctx.user.id)) ?? "free";

      return {
        success: true,
        data: {
          leadsCreated: usage.leadsCreated,
          apiCallsMade: usage.apiCallsMade,
          leadsQuota: subscription?.plan?.monthlyLeadsQuota || 0,
          apiCallsQuota: subscription?.plan?.monthlyApiCalls || 0,
          plan,
        },
      };
    } catch (error) {
      console.error("[Leads] Error getting monthly usage:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get usage information",
      });
    }
  }),

  /**
   * Alias para getMonthlyUsage (compatibilidade com extensão que chama leads.getStats)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const usage = await getCurrentMonthUsage(ctx.user.id);
      const subscription = await getUserSubscription(ctx.user.id);
      const plan = (await getActiveUserPlan(ctx.user.id)) ?? "free";

      return {
        success: true,
        data: {
          leadsCreated: usage.leadsCreated,
          apiCallsMade: usage.apiCallsMade,
          leadsQuota: subscription?.plan?.monthlyLeadsQuota || 0,
          apiCallsQuota: subscription?.plan?.monthlyApiCalls || 0,
          plan,
        },
      };
    } catch (error) {
      console.error("[Leads] Error getting stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get usage information",
      });
    }
  }),
});

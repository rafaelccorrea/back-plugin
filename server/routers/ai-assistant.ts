import { z } from "zod";
import { eq, asc, desc, and } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { getDb, getActiveUserPlan } from "../db";
import { aiCopilotConversations, aiCopilotMessages } from "../../drizzle/schema";
import { AISecurityProxy } from "../services/aiSecurityProxy";

/**
 * GUARDRAILS DE SEGURANÇA (EXTREMO)
 */
const FORBIDDEN_PATTERNS = [
  /rm\s+-rf/i, /drop\s+table/i, /truncate/i, /delete\s+from/i,
  /process\.env/i, /require\(/i, /eval\(/i, /exec\(/i, /spawn\(/i,
  /chmod/i, /chown/i, /sudo/i, /<script/i, /javascript:/i,
  /union\s+select/i, /information_schema/i, /pg_sleep/i,
  /\.\.\//, /\/etc\/passwd/i, /config\.ts/i, /\.env/i
];

function validateSafety(input: string): boolean {
  if (input.length > 2000) return false;
  return !FORBIDDEN_PATTERNS.some(pattern => pattern.test(input));
}

/** 
 * Remove tag <thinking>...</thinking> da resposta de forma rigorosa.
 */
function stripThinking(text: string): string {
  let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  cleaned = cleaned.replace(/^(Pensamento|Raciocínio|Thinking|Raciocinio):[\s\S]*?(\n\n|$)/i, "");
  return cleaned.trim().replace(/\n{3,}/g, "\n\n");
}

/** Frases que a IA NUNCA pode dizer (afirmar conclusão sem o usuário ter clicado ou negar acesso). */
const FORBIDDEN_CLAIM_PHRASES = [
  /foi criado com sucesso/i,
  /foi cadastrado com sucesso/i,
  /foi registrado com sucesso/i,
  /está registrado em nosso sistema/i,
  /agora está registrado/i,
  /foi agendado com sucesso/i,
  /agendamento confirmado/i,
  /lead .+ foi criado/i,
  /lead .+ foi cadastrado/i,
  /\bID:\s*\d+/i,
  /aqui estão os detalhes do lead/i,
  /detalhes do lead:/i,
  /não tenho acesso (em )?tempo real/i,
  /não posso confirmar que .+, pois não tenho acesso/i,
  /clique no botão acima/i,
];

/** Remove ou neutraliza afirmações proibidas na resposta do assistente. */
function enforceNoFalseClaims(text: string): string {
  let out = text;
  for (const phrase of FORBIDDEN_CLAIM_PHRASES) {
    const re = new RegExp(phrase.source, phrase.flags + "g");
    out = out.replace(re, "").replace(/\n{2,}/g, "\n\n").trim();
  }
  out = out.replace(/\bID\s*:\s*\d+/gi, "").replace(/\n{2,}/g, "\n\n").trim();
  return out;
}

/** Extrai o JSON da tag :::action{...}::: de forma ultra resiliente. */
function extractActionTag(content: string): { action: object | null; cleanContent: string } {
  // Regex que busca :::action{...}::: permitindo espaços, quebras de linha e blocos de código markdown dentro
  const actionRegex = /:::\s*action\s*([\s\S]*?)\s*:::/i;
  const match = content.match(actionRegex);
  
  if (!match) return { action: null, cleanContent: content };
  
  let jsonStr = match[1].trim();
  
  // Limpeza profunda do JSON string
  // 1. Remove blocos de código markdown se a IA colocou o JSON dentro deles
  jsonStr = jsonStr.replace(/^```(json)?\n?|```$/g, "").trim();
  
  let action: object | null = null;
  try {
    // Tenta o parse direto
    action = JSON.parse(jsonStr) as object;
  } catch (e) {
    try {
      // Se falhar, tenta limpar vírgulas extras no final de objetos/arrays e aspas inteligentes
      const fixedJson = jsonStr
        .replace(/,\s*([\]}])/g, "$1") // remove trailing commas
        .replace(/[\u201C\u201D]/g, '"') // aspas inteligentes para aspas normais
        .replace(/[\u2018\u2019]/g, "'");
      action = JSON.parse(fixedJson) as object;
    } catch (e2) {
      console.warn("[AI Assistant] extractActionTag: JSON parse failed even after cleanup", jsonStr);
    }
  }
  
  // Verifica se o objeto tem o campo 'type'
  if (!action || typeof action !== "object" || !("type" in action)) {
    // Se não for um JSON válido ou não tiver type, não remove a tag para não perder o texto, 
    // mas não retorna ação.
    return { action: null, cleanContent: content };
  }
  
  const cleanContent = content.replace(match[0], "").replace(/\n{2,}/g, "\n\n").trim();
  return { action, cleanContent };
}

const STATUS_TRANSLATIONS: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  lost: "Perdido",
  converted: "Convertido",
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function resolveConversation(userId: number, conversationId?: number | null): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  if (conversationId != null && Number.isFinite(conversationId)) {
    const [conv] = await db.select().from(aiCopilotConversations).where(and(eq(aiCopilotConversations.id, conversationId), eq(aiCopilotConversations.userId, userId))).limit(1);
    if (conv) return { id: conv.id };
  }
  const [inserted] = await db.insert(aiCopilotConversations).values({ userId }).returning({ id: aiCopilotConversations.id });
  if (!inserted) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create conversation" });
  return { id: inserted.id };
}

export const aiAssistantRouter = router({
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    const planRaw = (await getActiveUserPlan(ctx.user.id)) ?? "free";
    if (planRaw.toLowerCase() !== "professional" && planRaw.toLowerCase() !== "enterprise") return [];
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(aiCopilotConversations).where(eq(aiCopilotConversations.userId, ctx.user.id)).orderBy(desc(aiCopilotConversations.updatedAt));
  }),

  createNewConversation: protectedProcedure.mutation(async ({ ctx }) => {
    const planRaw = (await getActiveUserPlan(ctx.user.id)) ?? "free";
    if (planRaw.toLowerCase() !== "professional" && planRaw.toLowerCase() !== "enterprise") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Recurso exclusivo para planos Professional e Enterprise." });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
    const [inserted] = await db.insert(aiCopilotConversations).values({ userId: ctx.user.id }).returning({ id: aiCopilotConversations.id });
    return { conversationId: inserted.id };
  }),

  getHistory: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { messages: [] };
      const [conv] = await db.select({ id: aiCopilotConversations.id }).from(aiCopilotConversations).where(and(eq(aiCopilotConversations.id, input.conversationId), eq(aiCopilotConversations.userId, ctx.user.id))).limit(1);
      if (!conv) return { messages: [] };
      const rows = await db.select({ role: aiCopilotMessages.role, content: aiCopilotMessages.content })
        .from(aiCopilotMessages)
        .where(eq(aiCopilotMessages.conversationId, conv.id))
        .orderBy(asc(aiCopilotMessages.createdAt));
      return { messages: rows as { role: string; content: string }[] };
    }),

  clearHistory: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const planRaw = (await getActiveUserPlan(ctx.user.id)) ?? "free";
      if (planRaw.toLowerCase() !== "professional" && planRaw.toLowerCase() !== "enterprise") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Recurso exclusivo para planos Professional e Enterprise." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      const [conv] = await db.select().from(aiCopilotConversations).where(and(eq(aiCopilotConversations.id, input.conversationId), eq(aiCopilotConversations.userId, ctx.user.id))).limit(1);
      if (conv) {
        await db.delete(aiCopilotMessages).where(eq(aiCopilotMessages.conversationId, conv.id));
        await db.update(aiCopilotConversations).set({ updatedAt: new Date() }).where(eq(aiCopilotConversations.id, conv.id));
      }
      return { ok: true };
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const planRaw = (await getActiveUserPlan(ctx.user.id)) ?? "free";
      if (planRaw.toLowerCase() !== "professional" && planRaw.toLowerCase() !== "enterprise") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Recurso exclusivo para planos Professional e Enterprise." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      const [conv] = await db.select().from(aiCopilotConversations).where(and(eq(aiCopilotConversations.id, input.conversationId), eq(aiCopilotConversations.userId, ctx.user.id))).limit(1);
      if (conv) {
        await db.delete(aiCopilotMessages).where(eq(aiCopilotMessages.conversationId, conv.id));
        await db.delete(aiCopilotConversations).where(eq(aiCopilotConversations.id, conv.id));
      }
      return { ok: true };
    }),

  chat: protectedProcedure
    .input(z.object({
      conversationId: z.number().int().positive().optional(),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(2000)
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const planRaw = (await getActiveUserPlan(ctx.user.id)) ?? "free";
      if (planRaw.toLowerCase() !== "professional" && planRaw.toLowerCase() !== "enterprise") {
        throw new TRPCError({ code: "FORBIDDEN", message: "O Assistente de IA é exclusivo para planos Professional e Enterprise." });
      }

      const lastUserMessage = input.messages.filter(m => m.role === "user").pop()?.content || "";
      if (!validateSafety(lastUserMessage)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sua mensagem contém termos não permitidos." });
      }

      const aiProxy = new AISecurityProxy(ctx.user.id);
      const recentLeads = await aiProxy.getLeads(10);
      const recentAppointments = await aiProxy.getAppointments(10);
      
      const contextData = {
        leads: recentLeads.map(l => ({ id: l.id, name: l.name, status: STATUS_TRANSLATIONS[String(l.status ?? "")] ?? l.status ?? "", phone: l.phone, email: l.email, createdAt: formatDate(l.createdAt) })),
        appointments: recentAppointments.map(a => ({ title: a.title, type: a.type, startTime: formatDate(a.startTime) }))
      };

      const systemPrompt = `Você é o Especialista em Vendas Imobiliárias do ChatLead Pro.

=== REGRAS DE HONESTIDADE E AÇÃO (CRÍTICO) ===
1. NUNCA MINTA: Não diga que criou algo se o usuário não clicou no botão.
2. PROPOSTA: Diga "Clique no botão abaixo para confirmar" se tiver os dados.
3. FORMATO OBRIGATÓRIO: :::action{"type": "ACAO", "data": {...}}:::
4. SEMPRE use aspas duplas no JSON.

=== ACESSO AOS DADOS ===
- CONTEXTO ATUAL abaixo é a TABELA DE LEADS em tempo real. Use-a sempre.

=== COLETA DE DADOS OBRIGATÓRIA ===
- create_lead: name, phone, email.
- create_appointment: leadId, time (YYYY-MM-DD HH:mm:ss), title.
- update_lead_status: leadId, newStatus.

CONTEXTO ATUAL:
- Leads: ${JSON.stringify(contextData.leads)}
- Agendamentos: ${JSON.stringify(contextData.appointments)}`;

      try {
        const response = await invokeLLM({
          messages: [{ role: "system", content: systemPrompt }, ...input.messages],
        });
        const rawContent = response.choices[0]?.message?.content;
        let content: string = typeof rawContent === "string"
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent.map((c: unknown) => (c && typeof c === "object" && "text" in c && typeof (c as { text: string }).text === "string" ? (c as { text: string }).text : "")).filter(Boolean).join("\n") || ""
            : "";
        if (!validateSafety(content)) content = "Resposta bloqueada por segurança.";
        
        const { action: parsedAction, cleanContent: contentAfterAction } = extractActionTag(content);
        const action = parsedAction;
        content = contentAfterAction;

        content = stripThinking(content);
        content = enforceNoFalseClaims(content);

        const { id: conversationId } = await resolveConversation(ctx.user.id, input.conversationId);
        const db = await getDb();
        if (db) {
          await db.insert(aiCopilotMessages).values([
            { conversationId, role: "user", content: lastUserMessage },
            { conversationId, role: "assistant", content },
          ]);
          await db.update(aiCopilotConversations).set({ updatedAt: new Date() }).where(eq(aiCopilotConversations.id, conversationId));
        }

        return { content, action, timestamp: new Date().toISOString(), conversationId };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar sua solicitação." });
      }
    }),

  executeAction: protectedProcedure
    .input(z.object({ type: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const d = input.data as Record<string, unknown>;
      const has = (key: string) => d != null && key in d && (d[key] !== undefined && d[key] !== null && String(d[key]).trim() !== "");
      const num = (key: string) => (d != null && key in d ? Number(d[key]) : NaN);
      const str = (key: string) => (d != null && key in d ? String(d[key]).trim() : "");

      try {
        switch (input.type) {
          case "create_lead": {
            if (!has("name") || !has("phone") || !has("email")) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Dados obrigatórios faltando: nome, telefone e e-mail são necessários para cadastrar o lead." });
            }
            const aiProxy = new AISecurityProxy(ctx.user.id);
            await aiProxy.createLead({ name: str("name"), phone: str("phone"), email: str("email") });
            return { success: true, message: "Lead cadastrado com sucesso!" };
          }
          case "create_appointment": {
            const leadId = num("leadId");
            const time = str("time");
            const title = str("title");
            if (!Number.isFinite(leadId) || !time || !title) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Dados obrigatórios faltando: lead, data/hora e título são necessários para o agendamento." });
            }
            const startTime = new Date(time);
            if (isNaN(startTime.getTime())) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Data/hora inválida. Use o formato YYYY-MM-DD HH:mm:ss." });
            }
            const aiProxy = new AISecurityProxy(ctx.user.id);
            await aiProxy.createAppointment({ leadId, startTime, title, type: "meeting" });
            return { success: true, message: "Agendamento confirmado!" };
          }
          case "update_lead_status": {
            const leadId = num("leadId");
            const newStatus = str("newStatus");
            const allowed = ["new", "contacted", "qualified", "lost", "converted"];
            if (!Number.isFinite(leadId) || !newStatus || !allowed.includes(newStatus)) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Dados obrigatórios faltando: lead e novo status (new, contacted, qualified, lost, converted)." });
            }
            const aiProxy = new AISecurityProxy(ctx.user.id);
            await aiProxy.updateLeadStatus(leadId, newStatus);
            return { success: true, message: "Status do lead atualizado!" };
          }
          default:
            throw new TRPCError({ code: "BAD_REQUEST", message: "Ação não reconhecida." });
        }
      } catch (e: unknown) {
        if (e instanceof TRPCError) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "BAD_REQUEST", message: msg || "Erro ao executar ação." });
      }
    })
});

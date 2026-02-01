import { getDb } from "../db";
import { openClawAutomations, leads, Lead } from "../../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";

export interface OpenClawAction {
  type: string;
  config: any;
  lead: Lead;
}

/**
 * Processa automações do OpenClaw para um evento específico
 */
export async function processOpenClawAutomations(
  userId: number,
  event: string,
  lead: Lead
) {
  try {
    const db = await getDb();
    if (!db) return;

    // Buscar automações ativas para este usuário e evento
    const automations = await db
      .select()
      .from(openClawAutomations)
      .where(
        and(
          eq(openClawAutomations.userId, userId),
          eq(openClawAutomations.triggerEvent, event),
          eq(openClawAutomations.isActive, true),
          gte(openClawAutomations.minScore, lead.score || "0.00")
        )
      );

    for (const automation of automations) {
      console.log(`[OpenClaw] Executing automation: ${automation.name} for lead ${lead.id}`);
      
      const config = automation.actionConfig ? JSON.parse(automation.actionConfig) : {};
      
      // Simulação de chamada ao OpenClaw (em produção, aqui seria uma chamada de API)
      await executeOpenClawAction({
        type: automation.actionType,
        config,
        lead
      });
    }
  } catch (error) {
    console.error("[OpenClawService] Error processing automations:", error);
  }
}

/**
 * Executa uma ação específica via OpenClaw
 */
async function executeOpenClawAction(action: OpenClawAction) {
  // Nota: O OpenClaw geralmente funciona via Webhooks ou API local
  // Aqui implementamos a ponte lógica
  console.log(`[OpenClaw] Dispatching action ${action.type} to OpenClaw agent...`);
  
  // Exemplo de payload para o OpenClaw
  const payload = {
    agent: "OpenClaw-SDR",
    task: action.type,
    context: {
      lead_name: action.lead.name,
      lead_phone: action.lead.phone,
      lead_summary: action.lead.summary,
      config: action.config
    }
  };

  // Em um cenário real:
  // await fetch('https://openclaw.ai/api/v1/execute', { method: 'POST', body: JSON.stringify(payload) });
  
  return { success: true, taskId: "claw_" + Math.random().toString(36).substr(2, 9) };
}

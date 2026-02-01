import { invokeLLM } from "../_core/llm";

export interface LeadAnalysisResult {
  isPotentialLead: boolean;
  name?: string;
  phone?: string;
  email?: string;
  objective?: "buy" | "rent" | "sell" | "unknown";
  propertyType?: string;
  neighborhood?: string;
  budget?: string;
  urgency?: "cold" | "warm" | "hot";
  score?: number;
  summary?: string;
  suggestedResponse?: string;
  qualificationChecklist?: string[]; // Novos itens identificados automaticamente
}

const SDR_PROMPT = `Você é um SDR imobiliário profissional especializado em qualificar leads.

Sua tarefa é analisar a conversa do WhatsApp e extrair informações para o lead imobiliário. Além dos dados básicos, você deve identificar quais itens do "Checklist de Qualificação" foram concluídos com base no que o cliente disse.

O Checklist possui os seguintes IDs:
- "contact_validated": O contato forneceu nome ou confirmou ser o interessado.
- "budget_confirmed": O cliente mencionou quanto pode investir ou faixa de preço.
- "property_type_defined": O cliente disse se quer casa, apartamento, terreno, etc.
- "neighborhood_defined": O cliente mencionou bairros ou regiões de preferência.

Retorne um JSON com as seguintes chaves:
1. **is_potential_lead**: (boolean) true se for lead imobiliário, false caso contrário.
2. **nome**: Nome do cliente.
3. **phone**: Telefone do cliente.
4. **email**: Email do cliente.
5. **objetivo**: comprar/alugar/vender/desconhecido.
6. **tipo_imovel**: Tipo de imóvel.
7. **bairro**: Bairro de interesse.
8. **orcamento**: Orçamento mencionado.
9. **urgencia**: frio/morno/quente.
10. **score**: 0 a 1.
11. **resumo**: Resumo breve.
12. **resposta_sugerida**: Resposta para o cliente.
13. **checklist_concluido**: (array de strings) IDs do checklist identificados na conversa.

Retorne SOMENTE o JSON, sem explicações.`;

function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json\s*([\s\S]*?)\s*```/g, '$1');
  cleaned = cleaned.replace(/```\s*([\s\S]*?)\s*```/g, '$1');
  return cleaned.trim();
}

export async function analyzeConversation(
  conversation: string,
  contactName?: string
): Promise<LeadAnalysisResult> {
  try {
    const userMessage = `Conversa do WhatsApp:
${conversation}
${contactName ? `\nNome do contato: ${contactName}` : ""}

Analise e extraia os dados, incluindo os itens do checklist concluídos.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: SDR_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_object"
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    contentStr = cleanJsonResponse(contentStr);
    const parsed = JSON.parse(contentStr);

    const objectiveMap: Record<string, "buy" | "rent" | "sell" | "unknown"> = {
      comprar: "buy", buy: "buy", alugar: "rent", rent: "rent", vender: "sell", sell: "sell", desconhecido: "unknown", unknown: "unknown",
    };
    const urgencyMap: Record<string, "cold" | "warm" | "hot"> = {
      frio: "cold", cold: "cold", morno: "warm", warm: "warm", quente: "hot", hot: "hot",
    };

    const rawObjective = (parsed.objetivo || "unknown").toString().toLowerCase().trim();
    const rawUrgency = (parsed.urgencia || "cold").toString().toLowerCase().trim();

    return {
      isPotentialLead: parsed.is_potential_lead,
      name: parsed.nome || undefined,
      phone: parsed.phone || undefined,
      email: parsed.email || undefined,
      objective: objectiveMap[rawObjective] ?? "unknown",
      propertyType: parsed.tipo_imovel || undefined,
      neighborhood: parsed.bairro || undefined,
      budget: parsed.orcamento || undefined,
      urgency: urgencyMap[rawUrgency] ?? "cold",
      score: parsed.score ?? 0,
      summary: parsed.resumo || undefined,
      suggestedResponse: parsed.resposta_sugerida || undefined,
      qualificationChecklist: Array.isArray(parsed.checklist_concluido) ? parsed.checklist_concluido : [],
    };
  } catch (error) {
    console.error("[AI Analysis] Error analyzing conversation:", error);
    throw new Error(`Failed to analyze conversation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateImprovedResponse(
  leadInfo: LeadAnalysisResult,
  conversation: string
): Promise<string> {
  try {
    if (!leadInfo.isPotentialLead) return "Obrigado pelo contato!";
    const prompt = `Você é um SDR imobiliário profissional. Gere uma resposta personalizada para o lead.
Lead: ${JSON.stringify(leadInfo)}
Conversa: ${conversation}`;
    const response = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
    const content = response.choices[0]?.message?.content;
    return (typeof content === 'string' ? content : JSON.stringify(content)) || "Obrigado pelo interesse!";
  } catch (error) {
    return leadInfo.suggestedResponse || "Obrigado pelo interesse!";
  }
}

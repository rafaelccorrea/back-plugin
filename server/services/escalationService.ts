import { getDb } from "../db";
import { sentimentAlerts } from "../../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";

export interface EscalationRule {
  sentiment: "positive" | "negative" | "neutral";
  urgency: "low" | "medium" | "high";
  shouldEscalate: boolean;
  priority: number;
}

export interface AttendantStatus {
  id: string;
  name: string;
  status: "available" | "busy" | "away";
  currentConversations: number;
  maxConversations: number;
  averageResolutionTime: number;
  satisfactionScore: number;
}

export interface EscalationResult {
  shouldEscalate: boolean;
  priority: number;
  reason: string;
  suggestedAttendant?: AttendantStatus;
  estimatedWaitTime?: number;
}

/**
 * Serviço de Escalação Inteligente
 * Gerencia roteamento automático para atendentes humanos
 */
export class EscalationService {
  /**
   * Regras de escalação baseadas em sentimento e urgência
   */
  private escalationRules: EscalationRule[] = [
    // Positivo - Nunca escalar
    { sentiment: "positive", urgency: "low", shouldEscalate: false, priority: 0 },
    { sentiment: "positive", urgency: "medium", shouldEscalate: false, priority: 0 },
    { sentiment: "positive", urgency: "high", shouldEscalate: false, priority: 1 },

    // Neutro - Escalar se urgência alta
    { sentiment: "neutral", urgency: "low", shouldEscalate: false, priority: 0 },
    { sentiment: "neutral", urgency: "medium", shouldEscalate: true, priority: 2 },
    { sentiment: "neutral", urgency: "high", shouldEscalate: true, priority: 3 },

    // Negativo - Sempre escalar
    { sentiment: "negative", urgency: "low", shouldEscalate: true, priority: 2 },
    { sentiment: "negative", urgency: "medium", shouldEscalate: true, priority: 4 },
    { sentiment: "negative", urgency: "high", shouldEscalate: true, priority: 5 },
  ];

  /**
   * Mock de atendentes disponíveis
   * Em produção, isso viria do banco de dados
   */
  private attendants: AttendantStatus[] = [
    {
      id: "att_001",
      name: "João Silva",
      status: "available",
      currentConversations: 1,
      maxConversations: 5,
      averageResolutionTime: 8, // minutos
      satisfactionScore: 4.8,
    },
    {
      id: "att_002",
      name: "Maria Santos",
      status: "available",
      currentConversations: 2,
      maxConversations: 5,
      averageResolutionTime: 6,
      satisfactionScore: 4.9,
    },
    {
      id: "att_003",
      name: "Pedro Costa",
      status: "busy",
      currentConversations: 5,
      maxConversations: 5,
      averageResolutionTime: 10,
      satisfactionScore: 4.6,
    },
  ];

  /**
   * Verificar se deve escalar baseado em sentimento e urgência
   */
  async checkEscalation(
    sentiment: "positive" | "negative" | "neutral",
    urgency: "low" | "medium" | "high"
  ): Promise<EscalationResult> {
    const rule = this.escalationRules.find(
      (r) => r.sentiment === sentiment && r.urgency === urgency
    );

    if (!rule) {
      return {
        shouldEscalate: false,
        priority: 0,
        reason: "Nenhuma regra de escalação aplicável",
      };
    }

    if (!rule.shouldEscalate) {
      return {
        shouldEscalate: false,
        priority: rule.priority,
        reason: `Cliente ${sentiment}. Bot pode resolver.`,
      };
    }

    // Se deve escalar, encontrar melhor atendente
    const bestAttendant = this.findBestAttendant();

    if (!bestAttendant) {
      return {
        shouldEscalate: true,
        priority: rule.priority,
        reason: "Nenhum atendente disponível. Adicionado à fila.",
        estimatedWaitTime: 15, // minutos
      };
    }

    return {
      shouldEscalate: true,
      priority: rule.priority,
      reason: this.getEscalationReason(sentiment, urgency),
      suggestedAttendant: bestAttendant,
      estimatedWaitTime: this.calculateWaitTime(bestAttendant),
    };
  }

  /**
   * Encontrar melhor atendente disponível
   */
  private findBestAttendant(): AttendantStatus | null {
    const available = this.attendants.filter(
      (a) => a.status === "available" && a.currentConversations < a.maxConversations
    );

    if (available.length === 0) {
      return null;
    }

    // Ordenar por: satisfação (desc), conversas atuais (asc)
    return available.sort((a, b) => {
      if (b.satisfactionScore !== a.satisfactionScore) {
        return b.satisfactionScore - a.satisfactionScore;
      }
      return a.currentConversations - b.currentConversations;
    })[0];
  }

  /**
   * Calcular tempo estimado de espera
   */
  private calculateWaitTime(attendant: AttendantStatus): number {
    const avgTimePerConversation = attendant.averageResolutionTime;
    const currentLoad = attendant.currentConversations;
    return Math.ceil(avgTimePerConversation * currentLoad / 2);
  }

  /**
   * Gerar razão de escalação legível
   */
  private getEscalationReason(
    sentiment: "positive" | "negative" | "neutral",
    urgency: "low" | "medium" | "high"
  ): string {
    if (sentiment === "negative" && urgency === "high") {
      return "Cliente muito insatisfeito. Escalação urgente!";
    }
    if (sentiment === "negative") {
      return "Cliente insatisfeito. Escalando para atendente.";
    }
    if (urgency === "high") {
      return "Assunto urgente. Conectando com atendente.";
    }
    return "Escalando para atendente humano.";
  }

  /**
   * Criar alerta de escalação
   */
  async createEscalationAlert(
    conversationId: string,
    messageId: string,
    sentiment: "positive" | "negative" | "neutral",
    urgency: "low" | "medium" | "high"
  ) {
    try {
      const db = await getDb();
      if (!db) return;
      await db.insert(sentimentAlerts).values({
        conversationId,
        messageId,
        sentiment,
        urgency,
        alertSent: true,
      });
    } catch (error) {
      console.error("Erro ao criar alerta de escalação:", error);
    }
  }

  /**
   * Obter alertas ativos
   */
  async getActiveAlerts() {
    try {
      return await db
        .select()
        .from(sentimentAlerts)
        .where(eq(sentimentAlerts.resolvedAt, null));
    } catch (error) {
      console.error("Erro ao obter alertas ativos:", error);
      return [];
    }
  }

  /**
   * Resolver alerta
   */
  async resolveAlert(alertId: number) {
    try {
      const db = await getDb();
      if (!db) return;
      await db
        .update(sentimentAlerts)
        .set({ resolvedAt: new Date() })
        .where(eq(sentimentAlerts.id, alertId));
    } catch (error) {
      console.error("Erro ao resolver alerta:", error);
    }
  }

  /**
   * Obter estatísticas de escalação
   */
  async getEscalationStats() {
    try {
      const db = await getDb();
      if (!db) return null;
      const alerts = await db.select().from(sentimentAlerts);

      const stats = {
        totalAlerts: alerts.length,
        activeAlerts: alerts.filter((a) => !a.resolvedAt).length,
        resolvedAlerts: alerts.filter((a) => a.resolvedAt).length,
        byUrgency: {
          low: alerts.filter((a) => a.urgency === "low").length,
          medium: alerts.filter((a) => a.urgency === "medium").length,
          high: alerts.filter((a) => a.urgency === "high").length,
        },
        bySentiment: {
          positive: alerts.filter((a) => a.sentiment === "positive").length,
          negative: alerts.filter((a) => a.sentiment === "negative").length,
          neutral: alerts.filter((a) => a.sentiment === "neutral").length,
        },
      };

      return stats;
    } catch (error) {
      console.error("Erro ao obter estatísticas de escalação:", error);
      return null;
    }
  }

  /**
   * Obter atendentes disponíveis
   */
  getAvailableAttendants(): AttendantStatus[] {
    return this.attendants.filter(
      (a) => a.status === "available" && a.currentConversations < a.maxConversations
    );
  }

  /**
   * Obter todos os atendentes
   */
  getAllAttendants(): AttendantStatus[] {
    return this.attendants;
  }

  /**
   * Atualizar status de atendente
   */
  updateAttendantStatus(
    attendantId: string,
    status: "available" | "busy" | "away"
  ): boolean {
    const attendant = this.attendants.find((a) => a.id === attendantId);
    if (attendant) {
      attendant.status = status;
      return true;
    }
    return false;
  }

  /**
   * Incrementar conversa ativa
   */
  incrementConversation(attendantId: string): boolean {
    const attendant = this.attendants.find((a) => a.id === attendantId);
    if (attendant && attendant.currentConversations < attendant.maxConversations) {
      attendant.currentConversations++;
      return true;
    }
    return false;
  }

  /**
   * Decrementar conversa ativa
   */
  decrementConversation(attendantId: string): boolean {
    const attendant = this.attendants.find((a) => a.id === attendantId);
    if (attendant && attendant.currentConversations > 0) {
      attendant.currentConversations--;
      return true;
    }
    return false;
  }
}

export const escalationService = new EscalationService();

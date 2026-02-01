import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { sentimentService } from "../services/sentimentAnalysis";
import { TRPCError } from "@trpc/server";

const AnalyzeSentimentSchema = z.object({
  message: z.string().min(1, "Mensagem é obrigatória"),
  conversationId: z.string().optional(),
});

const GetHistorySchema = z.object({
  conversationId: z.string().min(1, "ID da conversa é obrigatório"),
});

export const sentimentRouter = router({
  /**
   * Analisar sentimento de uma mensagem
   * POST /api/sentiment/analyze
   */
  analyze: publicProcedure
    .input(AnalyzeSentimentSchema)
    .mutation(async ({ input }) => {
      try {
        if (!input.message || input.message.trim().length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Mensagem não pode estar vazia",
          });
        }

        const result = await sentimentService.analyzeSentiment(input.message);

        return {
          success: true,
          data: result,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Sentiment Router] Error analyzing sentiment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro ao analisar sentimento",
        });
      }
    }),

  /**
   * Analisar múltiplas mensagens (histórico)
   * POST /api/sentiment/analyze-batch
   */
  analyzeBatch: publicProcedure
    .input(
      z.object({
        messages: z.array(z.string()).min(1, "Deve haver pelo menos uma mensagem"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const results = await Promise.all(
          input.messages.map((msg) => sentimentService.analyzeSentiment(msg))
        );

        // Calcular agregados
        const positiveCount = results.filter((r) => r.sentiment === "positive").length;
        const negativeCount = results.filter((r) => r.sentiment === "negative").length;
        const neutralCount = results.filter((r) => r.sentiment === "neutral").length;
        const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

        // Detectar tendência
        let trend: "improving" | "declining" | "stable" = "stable";
        if (results.length > 1) {
          const firstHalf = results.slice(0, Math.ceil(results.length / 2));
          const secondHalf = results.slice(Math.ceil(results.length / 2));

          const firstAvg =
            firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
          const secondAvg =
            secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;

          if (secondAvg > firstAvg + 0.1) trend = "improving";
          else if (secondAvg < firstAvg - 0.1) trend = "declining";
        }

        return {
          success: true,
          data: {
            analyses: results,
            summary: {
              totalMessages: results.length,
              positiveCount,
              negativeCount,
              neutralCount,
              averageScore,
              sentimentTrend: trend,
              overallSatisfaction:
                averageScore >= 0.7
                  ? "Muito Satisfeito"
                  : averageScore >= 0.5
                    ? "Satisfeito"
                    : averageScore >= 0.3
                      ? "Neutro"
                      : "Insatisfeito",
            },
          },
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Sentiment Router] Error in batch analysis:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro ao analisar lote de mensagens",
        });
      }
    }),

  /**
   * Obter sugestão de resposta baseada em sentimento
   * POST /api/sentiment/suggest-response
   */
  suggestResponse: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "Mensagem é obrigatória"),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sentimentService.analyzeSentiment(input.message);

        return {
          success: true,
          data: {
            sentiment: result.sentiment,
            suggestedResponse: result.suggestedResponse,
            urgency: result.urgency,
            tone: result.tone,
            emotions: result.emotions,
          },
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Sentiment Router] Error suggesting response:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro ao gerar sugestão de resposta",
        });
      }
    }),

  /**
   * Obter estatísticas de sentimento (mock para demonstração)
   * GET /api/sentiment/stats
   */
  getStats: publicProcedure.query(async () => {
    try {
      // Em produção, isso viria do banco de dados
      // Por enquanto, retornamos dados de exemplo
      return {
        success: true,
        data: {
          totalAnalyzed: 1250,
          positivePercentage: 65,
          negativePercentage: 15,
          neutralPercentage: 20,
          averageSatisfaction: 0.75,
          trend: "improving",
          lastUpdated: new Date(),
          topKeywords: [
            { keyword: "excelente", count: 145 },
            { keyword: "adorei", count: 128 },
            { keyword: "problema", count: 89 },
            { keyword: "perfeito", count: 76 },
            { keyword: "frustrado", count: 45 },
          ],
          topEmotions: [
            { emotion: "satisfação", count: 320 },
            { emotion: "entusiasmo", count: 215 },
            { emotion: "frustração", count: 145 },
            { emotion: "curiosidade", count: 98 },
          ],
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("[Sentiment Router] Error getting stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Erro ao obter estatísticas",
      });
    }
  }),

  /**
   * Detectar alerta de cliente insatisfeito
   * POST /api/sentiment/check-alert
   */
  checkAlert: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "Mensagem é obrigatória"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await sentimentService.analyzeSentiment(input.message);

        const shouldAlert =
          result.sentiment === "negative" && result.urgency === "high";

        return {
          success: true,
          data: {
            shouldAlert,
            sentiment: result.sentiment,
            urgency: result.urgency,
            confidence: result.confidence,
            suggestedAction: shouldAlert
              ? "Conectar com atendente humano imediatamente"
              : result.urgency === "medium"
                ? "Oferecer opção de atendente"
                : "Continuar com bot",
          },
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Sentiment Router] Error checking alert:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Erro ao verificar alerta",
        });
      }
    }),
});

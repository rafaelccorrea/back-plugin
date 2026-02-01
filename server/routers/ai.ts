import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const aiRouter = router({
  /**
   * Chat com IA para sugestões de resposta
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.object({
          leadName: z.string().optional(),
          leadEmail: z.string().optional(),
          leadPhone: z.string().optional(),
          conversationHistory: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // TODO: Integrar com OpenAI ou outro serviço de IA
        // Por enquanto, retornar resposta genérica

        const systemPrompt = `Você é um assistente de vendas inteligente para a plataforma ChatLead Pro.
Seu objetivo é ajudar os usuários a responder mensagens de leads de forma profissional e eficaz.
${input.context?.leadName ? `O lead se chama ${input.context.leadName}.` : ""}
${input.context?.leadEmail ? `Email do lead: ${input.context.leadEmail}.` : ""}
${input.context?.leadPhone ? `Telefone do lead: ${input.context.leadPhone}.` : ""}

Respostas devem ser:
- Profissionais e educadas
- Breves e diretas
- Personalizadas quando possível
- Focadas em conversão`;

        // Simular resposta da IA
        const response = `Obrigado por sua mensagem! Como posso ajudá-lo hoje? 

Estou aqui para responder suas dúvidas sobre nossos serviços e ajudá-lo a encontrar a melhor solução para suas necessidades.`;

        return {
          success: true,
          data: {
            response,
            confidence: 0.85,
            suggestions: [
              "Enviar proposta personalizada",
              "Agendar uma reunião",
              "Enviar mais informações",
            ],
          },
        };
      } catch (error) {
        console.error("[AI] Failed to chat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao processar mensagem",
        });
      }
    }),

  /**
   * Gerar sugestão de resposta baseada em histórico
   */
  suggestResponse: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        lastMessage: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        // TODO: Integrar com IA real

        const suggestions = [
          "Obrigado pelo seu interesse! Gostaria de agendar uma reunião?",
          "Poderia me fornecer mais detalhes sobre suas necessidades?",
          "Tenho uma solução perfeita para seu caso. Posso enviar uma proposta?",
          "Qual é o melhor horário para conversarmos?",
        ];

        return {
          success: true,
          data: {
            suggestions: suggestions.slice(0, 3),
          },
        };
      } catch (error) {
        console.error("[AI] Failed to suggest response:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao gerar sugestão",
        });
      }
    }),
});

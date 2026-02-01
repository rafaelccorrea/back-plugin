import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { escalationService } from "../services/escalationService";

export const escalationRouter = router({
  /**
   * Verificar se deve escalar baseado em sentimento
   */
  checkEscalation: publicProcedure
    .input(
      z.object({
        sentiment: z.enum(["positive", "negative", "neutral"]),
        urgency: z.enum(["low", "medium", "high"]),
      })
    )
    .mutation(async ({ input }) => {
      return await escalationService.checkEscalation(input.sentiment, input.urgency);
    }),

  /**
   * Criar alerta de escalação
   */
  createAlert: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        messageId: z.string(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
        urgency: z.enum(["low", "medium", "high"]),
      })
    )
    .mutation(async ({ input }) => {
      await escalationService.createEscalationAlert(
        input.conversationId,
        input.messageId,
        input.sentiment,
        input.urgency
      );
      return { success: true };
    }),

  /**
   * Obter alertas ativos
   */
  getActiveAlerts: publicProcedure.query(async () => {
    return await escalationService.getActiveAlerts();
  }),

  /**
   * Resolver alerta
   */
  resolveAlert: publicProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      await escalationService.resolveAlert(input.alertId);
      return { success: true };
    }),

  /**
   * Obter estatísticas de escalação
   */
  getStats: publicProcedure.query(async () => {
    return await escalationService.getEscalationStats();
  }),

  /**
   * Obter atendentes disponíveis
   */
  getAvailableAttendants: publicProcedure.query(async () => {
    return escalationService.getAvailableAttendants();
  }),

  /**
   * Obter todos os atendentes
   */
  getAllAttendants: publicProcedure.query(async () => {
    return escalationService.getAllAttendants();
  }),

  /**
   * Atualizar status de atendente
   */
  updateAttendantStatus: publicProcedure
    .input(
      z.object({
        attendantId: z.string(),
        status: z.enum(["available", "busy", "away"]),
      })
    )
    .mutation(async ({ input }) => {
      const success = escalationService.updateAttendantStatus(
        input.attendantId,
        input.status
      );
      return { success };
    }),

  /**
   * Incrementar conversa ativa
   */
  incrementConversation: publicProcedure
    .input(z.object({ attendantId: z.string() }))
    .mutation(async ({ input }) => {
      const success = escalationService.incrementConversation(input.attendantId);
      return { success };
    }),

  /**
   * Decrementar conversa ativa
   */
  decrementConversation: publicProcedure
    .input(z.object({ attendantId: z.string() }))
    .mutation(async ({ input }) => {
      const success = escalationService.decrementConversation(input.attendantId);
      return { success };
    }),
});

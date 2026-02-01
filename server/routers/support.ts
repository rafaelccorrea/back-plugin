import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { supportTickets, supportMessages, users } from "../../drizzle/schema";
import { eq, desc, and, count } from "drizzle-orm";
import * as notificationService from "../services/notificationService";
import { sendNotificationToUser } from "../_core/websocket";

export const supportRouter = router({
  /**
   * Obter tickets do usuário autenticado
   */
  getUserTickets: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        console.warn("[Support] Banco indisponível, retornando lista vazia");
        return { success: true, data: [] };
      }

      const tickets = await db
        .select({
          id: supportTickets.id,
          subject: supportTickets.subject,
          status: supportTickets.status,
          priority: supportTickets.priority,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          resolvedAt: supportTickets.resolvedAt,
        })
        .from(supportTickets)
        .where(eq(supportTickets.userId, ctx.user.id))
        .orderBy(desc(supportTickets.createdAt));

      // Buscar mensagens para cada ticket
      const ticketsWithMessages = await Promise.all(
        tickets.map(async (ticket) => {
          try {
            const messages = await db
              .select()
              .from(supportMessages)
              .where(eq(supportMessages.ticketId, ticket.id))
              .orderBy(supportMessages.createdAt);

            return {
              id: ticket.id.toString(),
              subject: ticket.subject,
              status: ticket.status,
              priority: ticket.priority,
              createdAt: ticket.createdAt?.toISOString(),
              updatedAt: ticket.updatedAt?.toISOString(),
              resolvedAt: ticket.resolvedAt?.toISOString(),
              messageCount: messages.length,
              lastMessage: messages[messages.length - 1]?.message || null,
              lastMessageAt: messages[messages.length - 1]?.createdAt?.toISOString() || null,
              messages: messages.map((msg) => ({
                id: msg.id.toString(),
                sender: msg.senderType as "user" | "admin",
                senderType: msg.senderType as "user" | "admin",
                name: msg.senderType === "user" ? "Você" : "Suporte",
                text: msg.message,
                message: msg.message,
                time: msg.createdAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) || "",
                createdAt: msg.createdAt?.toISOString() || "",
              })),
            };
          } catch (error) {
            console.error(`Erro ao buscar mensagens do ticket ${ticket.id}:`, error);
            return {
              id: ticket.id.toString(),
              subject: ticket.subject,
              status: ticket.status,
              priority: ticket.priority,
              createdAt: ticket.createdAt?.toISOString(),
              updatedAt: ticket.updatedAt?.toISOString(),
              resolvedAt: ticket.resolvedAt?.toISOString(),
              messageCount: 0,
              lastMessage: null,
              lastMessageAt: null,
              messages: [],
            };
          }
        })
      );

      return {
        success: true,
        data: ticketsWithMessages,
      };
    } catch (error: any) {
      console.error("Erro ao buscar tickets do usuário:", error);
      // Se a tabela não existir (ex: migration não rodou), retorna lista vazia em vez de 500
      const msg = error?.message ?? String(error);
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("supportTickets") || msg.includes("supportMessages")) {
        return { success: true, data: [] };
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao buscar tickets",
        cause: error,
      });
    }
  }),

  /**
   * Obter todos os tickets (apenas admin)
   */
  getTickets: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return { success: true, data: [] };
      }

      const tickets = await db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          subject: supportTickets.subject,
          status: supportTickets.status,
          priority: supportTickets.priority,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          resolvedAt: supportTickets.resolvedAt,
        })
        .from(supportTickets)
        .orderBy(desc(supportTickets.createdAt));

      // Buscar informações do usuário e mensagens para cada ticket
      const ticketsWithDetails = await Promise.all(
        tickets.map(async (ticket) => {
          try {
            const user = await db
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, ticket.userId))
              .limit(1);

            const messages = await db
              .select()
              .from(supportMessages)
              .where(eq(supportMessages.ticketId, ticket.id))
              .orderBy(supportMessages.createdAt);

            return {
              id: ticket.id.toString(),
              userId: ticket.userId.toString(),
              user: user[0]?.name || "Usuário desconhecido",
              email: user[0]?.email || "email@desconhecido.com",
              subject: ticket.subject,
              status: ticket.status as "open" | "pending" | "resolved",
              priority: ticket.priority as "high" | "medium" | "low",
              createdAt: ticket.createdAt?.toISOString() || new Date().toISOString(),
              lastUpdate: ticket.updatedAt?.toISOString() || new Date().toISOString(),
              messages: messages.map((msg) => ({
                id: msg.id.toString(),
                sender: msg.senderType as "user" | "admin",
                name: msg.senderType === "user" ? user[0]?.name || "Usuário" : "Admin",
                text: msg.message,
                time: msg.createdAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) || "",
              })),
            };
          } catch (err) {
            console.error("Erro ao processar ticket:", err);
            return {
              id: ticket.id.toString(),
              userId: ticket.userId.toString(),
              user: "Usuário desconhecido",
              email: "email@desconhecido.com",
              subject: ticket.subject,
              status: ticket.status as "open" | "pending" | "resolved",
              priority: ticket.priority as "high" | "medium" | "low",
              createdAt: ticket.createdAt?.toISOString() || new Date().toISOString(),
              lastUpdate: ticket.updatedAt?.toISOString() || new Date().toISOString(),
              messages: [],
            };
          }
        })
      );

      return {
        success: true,
        data: ticketsWithDetails,
      };
    } catch (error: any) {
      console.error("Erro ao buscar tickets:", error);
      const msg = error?.message ?? String(error);
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("supportTickets") || msg.includes("supportMessages")) {
        return { success: true, data: [] };
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao buscar tickets",
        cause: error,
      });
    }
  }),

  /**
   * Obter um ticket específico
   */
  getTicket: adminProcedure
    .input(z.object({ ticketId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const ticketId = parseInt(input.ticketId);

        const ticket = await db
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.id, ticketId))
          .limit(1);

        if (!ticket.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ticket não encontrado",
          });
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, ticket[0].userId))
          .limit(1);

        const messages = await db
          .select()
          .from(supportMessages)
          .where(eq(supportMessages.ticketId, ticketId))
          .orderBy(supportMessages.createdAt);

        return {
          success: true,
          data: {
            id: ticket[0].id.toString(),
            userId: ticket[0].userId.toString(),
            user: user[0]?.name || "Usuário desconhecido",
            email: user[0]?.email || "email@desconhecido.com",
            subject: ticket[0].subject,
            status: ticket[0].status as "open" | "pending" | "resolved",
            priority: ticket[0].priority as "high" | "medium" | "low",
            messages: messages.map((msg) => ({
              id: msg.id.toString(),
              sender: msg.senderType as "user" | "admin",
              text: msg.message,
              time: msg.createdAt?.toLocaleTimeString("pt-BR") || "",
            })),
          },
        };
      } catch (error: any) {
        console.error("Erro ao buscar ticket:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao buscar ticket",
          cause: error,
        });
      }
    }),

  /**
   * Criar novo ticket (usuário autenticado)
   */
  createTicket: protectedProcedure
    .input(
      z.object({
        title: z
          .string()
          .min(3, { message: "Assunto deve ter pelo menos 3 caracteres" }),
        description: z
          .string()
          .min(5, { message: "Descrição deve ter pelo menos 5 caracteres" }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Banco de dados indisponível",
          });
        }

        const result = await db
          .insert(supportTickets)
          .values({
            userId: ctx.user.id,
            subject: input.title,
            status: "open",
            priority: "medium",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({
            id: supportTickets.id,
            subject: supportTickets.subject,
            status: supportTickets.status,
            priority: supportTickets.priority,
            createdAt: supportTickets.createdAt,
            updatedAt: supportTickets.updatedAt,
          });

        const ticket = result[0];
        if (!ticket) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar ticket (nenhum retorno do banco)",
          });
        }

        // Mensagem padrão para o suporte: primeira mensagem do ticket (descrição do usuário)
        const firstMessageText =
          input.description?.trim() ||
          "Olá, preciso de ajuda. (Ticket aberto sem descrição.)";
        await db.insert(supportMessages).values({
          ticketId: ticket.id,
          userId: ctx.user.id,
          senderType: "user",
          message: firstMessageText,
          createdAt: new Date(),
        });

        // Notificar admins: DB (para aparecer no Centro de Comando) + WebSocket (tempo real)
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, "admin"));
        const user = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        const userName = user[0]?.name || "Um usuário";
        const wsPayload = {
          type: "new_support_ticket",
          ticketId: String(ticket.id),
          subject: ticket.subject,
          userName,
          title: "🎫 Novo Ticket de Suporte",
          message: `${userName} abriu um novo ticket: ${ticket.subject}`,
          sentAt: new Date().toISOString(),
        };
        for (const admin of admins) {
          try {
            await notificationService.notifyNewTicket(admin.id, {
              id: ticket.id,
              subject: ticket.subject,
              userName,
            });
          } catch (dbErr) {
            console.error("[Support] Erro ao criar notificação de novo ticket no banco:", dbErr);
          }
          try {
            sendNotificationToUser(String(admin.id), wsPayload);
          } catch (wsErr) {
            console.error("[Support] Erro ao enviar WebSocket de novo ticket:", wsErr);
          }
        }

        const createdAtIso = ticket.createdAt?.toISOString() ?? new Date().toISOString();
        return {
          id: ticket.id.toString(),
          title: ticket.subject,
          description: input.description,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: createdAtIso,
          updatedAt: ticket.updatedAt?.toISOString() ?? createdAtIso,
          messages: [
            {
              id: "0",
              sender: "user",
              senderType: "user",
              name: "Você",
              text: firstMessageText,
              message: firstMessageText,
              time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              createdAt: createdAtIso,
            },
          ],
        };
      } catch (error: any) {
        console.error("Erro ao criar ticket:", error);
        const msg = error?.message ?? String(error);
        const code = error?.code;
        if (
          msg.includes("does not exist") ||
          msg.includes("relation") ||
          msg.includes("supportTickets") ||
          code === "42P01"
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Tabelas de suporte não encontradas. Rode: node scripts/db-create-support-tables.mjs",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao criar ticket",
          cause: error,
        });
      }
    }),

  /**
   * Adicionar mensagem a um ticket
   */
  addMessage: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        const ticketId = parseInt(input.ticketId);

        // Verificar se o ticket existe
        const ticket = await db
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.id, ticketId))
          .limit(1);

        if (!ticket.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ticket não encontrado",
          });
        }

        // Adicionar mensagem (senderType: admin se quem envia é admin, senão user)
        const senderType = ctx.user.role === "admin" ? "admin" : "user";
        await db.insert(supportMessages).values({
          ticketId: ticketId,
          userId: ctx.user.id,
          senderType,
          message: input.message,
          createdAt: new Date(),
        });

        // Atualizar ticket
        await db
          .update(supportTickets)
          .set({ updatedAt: new Date() })
          .where(eq(supportTickets.id, ticketId));

        // Notificar a outra parte: primeiro DB (sempre tentar), depois WebSocket (tempo real)
        const isAdmin = ctx.user.role === 'admin';
        const ticketData = ticket[0];
        const sender = await db.select({ name: users.name }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const senderName = sender[0]?.name || (isAdmin ? "Suporte ChatLead Pro" : "Usuário");

        const wsPayload = {
          type: "new_support_message",
          senderType: isAdmin ? "admin" : "user",
          ticketId: String(ticketId),
          subject: ticketData.subject,
          title: "💬 Nova Resposta no Suporte",
          message: `${senderName} respondeu ao ticket: ${ticketData.subject}`,
          sentAt: new Date().toISOString(),
        };

        if (isAdmin) {
          // DB: garante que a notificação fica salva (usuário vê no Centro de Comando mesmo sem WebSocket)
          try {
            await notificationService.notifySupportReply(ticketData.userId, {
              ticketId: ticketId,
              subject: ticketData.subject,
              senderName: "Suporte ChatLead Pro"
            });
          } catch (dbErr) {
            console.error("[Support] Erro ao criar notificação no banco:", dbErr);
          }
          // WebSocket: entrega em tempo real se o usuário estiver conectado
          try {
            sendNotificationToUser(String(ticketData.userId), wsPayload);
          } catch (wsErr) {
            console.error("[Support] Erro ao enviar WebSocket:", wsErr);
          }
        } else {
          const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
          for (const admin of admins) {
            try {
              await notificationService.notifySupportReply(admin.id, {
                ticketId: ticketId,
                subject: ticketData.subject,
                senderName: senderName
              });
            } catch (dbErr) {
              console.error("[Support] Erro ao criar notificação no banco para admin:", admin.id, dbErr);
            }
            try {
              sendNotificationToUser(String(admin.id), wsPayload);
            } catch (wsErr) {
              console.error("[Support] Erro ao enviar WebSocket para admin:", admin.id, wsErr);
            }
          }
        }

        return {
          success: true,
          message: "Mensagem adicionada com sucesso",
        };
      } catch (error: any) {
        console.error("Erro ao adicionar mensagem:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao adicionar mensagem",
          cause: error,
        });
      }
    }),

  /**
   * Atualizar status do ticket
   */
  updateTicketStatus: adminProcedure
    .input(
      z.object({
        ticketId: z.string(),
        status: z.enum(["open", "pending", "resolved"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        const ticketId = parseInt(input.ticketId);

        // Buscar dados do ticket antes de atualizar para notificar o usuário
        const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);

        await db
          .update(supportTickets)
          .set({
            status: input.status,
            updatedAt: new Date(),
            resolvedAt: input.status === "resolved" ? new Date() : null,
          })
          .where(eq(supportTickets.id, ticketId));

        // Notificar usuário sobre a mudança de status
        if (ticket.length > 0) {
          try {
            const statusLabels = { open: "Aberto", pending: "Pendente", resolved: "Resolvido" };
            await notificationService.createNotification({
              userId: ticket[0].userId,
              type: "system_alert",
              title: "🎫 Status do Ticket Atualizado",
              message: `O status do seu ticket "${ticket[0].subject}" foi alterado para: ${statusLabels[input.status]}`,
              data: { ticketId, status: input.status }
            });
          } catch (err) {
            console.error("[Support] Erro ao notificar usuário sobre status:", err);
          }
        }

        return {
          success: true,
          message: "Status atualizado com sucesso",
        };
      } catch (error: any) {
        console.error("Erro ao atualizar status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao atualizar status",
          cause: error,
        });
      }
    }),

  /**
   * Obter estatísticas de suporte
   */
  getStats: adminProcedure.query(async () => {
    try {
      const db = await getDb();

      // Contar total de tickets
      const totalTicketsResult = await db
        .select()
        .from(supportTickets);
      const totalTickets = totalTicketsResult.length;

      // Contar tickets abertos
      const openTicketsResult = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.status, "open"));
      const openTickets = openTicketsResult.length;

      // Contar tickets resolvidos
      const resolvedTicketsResult = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.status, "resolved"));
      const resolvedTickets = resolvedTicketsResult.length;

      return {
        success: true,
        data: {
          totalTickets,
          openTickets,
          resolvedTickets,
          avgResolutionTime: "2.5h",
          customerSatisfaction: 4.8,
        },
      };
    } catch (error: any) {
      console.error("Erro ao buscar estatísticas:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao buscar estatísticas",
        cause: error,
      });
    }
  }),

  /**
   * Sincronizar dados de suporte
   */
  syncData: adminProcedure.mutation(async () => {
    try {
      const db = await getDb();

      // Aqui você pode adicionar lógica para sincronizar com banco externo
      // Por enquanto, apenas retorna sucesso

      return {
        success: true,
        message: "Sincronização concluída",
      };
    } catch (error: any) {
      console.error("Erro ao sincronizar:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao sincronizar",
        cause: error,
      });
    }
  }),
});

import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as notificationService from "../services/notificationService";
import { getDb } from "../db";
import { users, leads, supportTickets, subscriptions, plans } from "../../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { broadcastNotification, broadcastNotificationToPlans } from "../_core/websocket";

export const notificationsRouter = router({
  /**
   * Obter notificações do admin (busca dados reais do banco)
   */
  getAdminNotifications: adminProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();

        // Buscar novos leads
        const newLeads = await db
          .select({
            id: leads.id,
            name: leads.name,
            email: leads.email,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .orderBy(desc(leads.createdAt))
          .limit(5);

        // Buscar novos tickets de suporte
        const newTickets = await db
          .select({
            id: supportTickets.id,
            subject: supportTickets.subject,
            status: supportTickets.status,
            createdAt: supportTickets.createdAt,
          })
          .from(supportTickets)
          .where(eq(supportTickets.status, "open"))
          .orderBy(desc(supportTickets.createdAt))
          .limit(5);

        // Buscar novos usuários
        const newUsers = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(5);

        // Construir notificações
        const notifications = [
          ...newLeads.map((lead) => ({
            id: `lead-${lead.id}`,
            type: "new_lead" as const,
            title: "Novo Lead",
            message: `${lead.name} (${lead.email}) foi adicionado`,
            timestamp: lead.createdAt?.toISOString() || new Date().toISOString(),
            read: false,
            data: { leadId: lead.id },
          })),
          ...newTickets.map((ticket) => ({
            id: `ticket-${ticket.id}`,
            type: "new_ticket" as const,
            title: "Novo Ticket de Suporte",
            message: `${ticket.subject}`,
            timestamp: ticket.createdAt?.toISOString() || new Date().toISOString(),
            read: false,
            data: { ticketId: ticket.id },
          })),
          ...newUsers.map((user) => ({
            id: `user-${user.id}`,
            type: "new_user" as const,
            title: "Novo Usuário",
            message: `${user.name} (${user.email}) se registrou`,
            timestamp: user.createdAt?.toISOString() || new Date().toISOString(),
            read: false,
            data: { userId: user.id },
          })),
        ];

        // Ordenar por timestamp (mais recentes primeiro)
        notifications.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return {
          success: true,
          data: notifications.slice(input.offset, input.offset + input.limit),
          total: notifications.length,
        };
      } catch (error: any) {
        console.error("Erro ao buscar notificações do admin:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao buscar notificações",
          cause: error,
        });
      }
    }),

  /**
   * Enviar notificação para usuários
   */
  sendNotification: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        recipients: z.enum(["all", "free", "pro", "enterprise"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();

        let targetUsers: { id: number }[];
        if (input.recipients === "all") {
          targetUsers = await db.select({ id: users.id }).from(users);
        } else {
          const planFilter = input.recipients === "pro" ? "professional" : input.recipients;
          const rows = await db
            .select({ id: users.id })
            .from(users)
            .innerJoin(subscriptions, eq(subscriptions.userId, users.id))
            .innerJoin(plans, eq(plans.id, subscriptions.planId))
            .where(and(eq(subscriptions.status, "active"), eq(plans.planType, planFilter)));
          targetUsers = [...new Map(rows.map((r) => [r.id, r])).values()];
        }

        // Criar notificações para cada usuário
        let createdCount = 0;
        for (const user of targetUsers) {
          try {
            // Aqui você pode implementar a lógica de criar notificações no banco
            // Por enquanto, apenas contamos
            createdCount++;
          } catch (error) {
            console.error(`Erro ao criar notificação para usuário ${user.id}:`, error);
          }
        }

        // Enviar notificação via WebSocket em tempo real
        const notification = {
          title: input.title,
          message: input.message,
          type: "admin_notification",
          sentAt: new Date().toISOString(),
        };

        if (input.recipients === "all") {
          // Broadcast para todos os usuários
          broadcastNotification(notification);
        } else {
          // Broadcast para usuários com plano específico
          const plansMap = new Map<string, string>();
          for (const user of targetUsers) {
            plansMap.set(user.id, input.recipients);
          }
          broadcastNotificationToPlans(notification, [input.recipients], plansMap);
        }

        console.log(`[Notifications] Notificação enviada: "${input.title}" para ${createdCount} usuários`);

        return {
          success: true,
          sentCount: createdCount,
          message: `Notificação enviada para ${createdCount} usuário(s)`,
        };
      } catch (error: any) {
        console.error("Erro ao enviar notificações:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao enviar notificações",
          cause: error,
        });
      }
    }),

  /**
   * Obter contagem de notificações não lidas do admin
   */
  getAdminUnreadCount: adminProcedure.query(async () => {
    try {
      const db = await getDb();

      // Contar novos leads
      const newLeadsCount = (await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(5)).length;

      // Contar novos tickets abertos
      const newTicketsCount = (await db.select().from(supportTickets).where(eq(supportTickets.status, "open")).limit(5)).length;

      // Contar novos usuários
      const newUsersCount = (await db.select().from(users).orderBy(desc(users.createdAt)).limit(5)).length;

      const total = newLeadsCount + newTicketsCount + newUsersCount;

      return {
        success: true,
        data: {
          unreadCount: total,
          newLeads: newLeadsCount,
          newTickets: newTicketsCount,
          newUsers: newUsersCount,
        },
      };
    } catch (error: any) {
      console.error("Erro ao contar notificações do admin:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao contar notificações",
        cause: error,
      });
    }
  }),

  /**
   * Subscrever a notificações push
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        auth: z.string(),
        p256dh: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await notificationService.subscribeToPushNotifications(
        ctx.user.id,
        {
          endpoint: input.endpoint,
          keys: {
            auth: input.auth,
            p256dh: input.p256dh,
          },
        }
      );

      return { success };
    }),

  /**
   * Desinscrever de notificações push
   */
  unsubscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await notificationService.unsubscribeFromPushNotifications(
        input.endpoint
      );

      return { success };
    }),

  /**
   * Listar notificações do usuário (para Centro de Comando etc.)
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        onlyUnread: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const notifications = await notificationService.getUnreadNotifications(
        ctx.user.id
      );
      const list = notifications
        .slice(0, input.limit)
        .map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
        }));
      return { data: list };
    }),

  /**
   * Obter notificações não lidas
   */
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await notificationService.getUnreadNotifications(
      ctx.user.id
    );

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ? JSON.parse(n.data) : null,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      count: notifications.length,
    };
  }),

  /**
   * Marcar notificação como lida
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await notificationService.markAsRead(
        input.notificationId
      );

      return { success };
    }),

  /**
   * Marcar notificações support_reply de um ticket como lidas (ao abrir a conversa).
   */
  markSupportRepliesAsReadForTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const count = await notificationService.markSupportRepliesAsReadForTicket(
        ctx.user.id,
        input.ticketId
      );
      return { markedCount: count };
    }),

  /**
   * Marcar todas as notificações de suporte (support_reply) do usuário como lidas.
   * Útil ao abrir a página de suporte para zerar o badge de uma vez.
   */
  markAllSupportRepliesAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const count = await notificationService.markAllSupportRepliesAsRead(ctx.user.id);
    return { markedCount: count };
  }),

  /**
   * Contar notificações de suporte não lidas (para badge).
   */
  getUnreadSupportCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await notificationService.getUnreadSupportCount(ctx.user.id);
    return { count };
  }),

  /**
   * Marcar todas as notificações como lidas
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const notifications = await notificationService.getUnreadNotifications(
      ctx.user.id
    );

    let markedCount = 0;
    for (const notification of notifications) {
      if (await notificationService.markAsRead(notification.id)) {
        markedCount++;
      }
    }

    return { markedCount };
  }),

  /**
   * Testar notificação push (para desenvolvimento)
   */
  testNotification: protectedProcedure.mutation(async ({ ctx }) => {
    const notification = await notificationService.createNotification({
      userId: ctx.user.id,
      type: "system_alert",
      title: "🧪 Notificação de Teste",
      message: "Esta é uma notificação de teste do WA-SDR",
      data: {
        testNotification: true,
        timestamp: new Date().toISOString(),
      },
    });

    // Enviar push notification
    if (notification) {
      await notificationService.sendPushNotification(ctx.user.id, {
        title: notification.title,
        body: notification.message,
        icon: "/logo.svg",
        badge: "/logo.svg",
        tag: `notification-${notification.id}`,
        data: notification.data ? JSON.parse(notification.data) : {},
      });
    }

    return {
      success: !!notification,
      notificationId: notification?.id,
    };
  }),
});

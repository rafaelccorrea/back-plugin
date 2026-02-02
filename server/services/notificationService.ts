import { getDb } from "../db";
import { notifications, pushSubscriptions, Notification, InsertNotification } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export type NotificationType = 
  | "new_lead"
  | "quota_warning"
  | "quota_exceeded"
  | "payment_failed"
  | "subscription_updated"
  | "lead_status_changed"
  | "system_alert"
  | "new_support_ticket"
  | "support_reply";

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data?: Record<string, any>;
}

/**
 * Criar uma notificação no banco de dados
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const notification: InsertNotification = {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ? JSON.stringify(input.data) : null,
      isRead: false,
      isPushed: false,
    };

    const result = await db.insert(notifications).values(notification);
    
    // Retornar a notificação criada com os dados inseridos
    const created: Notification = {
      id: 0, // Será gerado pelo banco
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || null,
      isRead: notification.isRead || false,
      isPushed: notification.isPushed || false,
      createdAt: new Date(),
    };
    
    return created;
  } catch (error) {
    console.error("[NotificationService] Error creating notification:", error);
    throw error;
  }
}

/**
 * Obter notificações não lidas do usuário
 */
export async function getUnreadNotifications(userId: number): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return result;
  } catch (error) {
    console.error("[NotificationService] Error fetching unread notifications:", error);
    return [];
  }
}

/**
 * Marcar notificação como lida
 */
export async function markAsRead(notificationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));

    return true;
  } catch (error) {
    console.error("[NotificationService] Error marking notification as read:", error);
    return false;
  }
}

/**
 * Marcar todas as notificações support_reply de um ticket como lidas (quando o usuário abre a conversa).
 */
export async function markSupportRepliesAsReadForTicket(
  userId: number,
  ticketId: number
): Promise<number> {
  const list = await getUnreadNotifications(userId);
  let count = 0;
  const ticketIdNum = Number(ticketId);
  for (const n of list) {
    if (n.type !== "support_reply" || !n.data) continue;
    try {
      const data = JSON.parse(n.data) as { ticketId?: number | string };
      const nTicketId = data?.ticketId != null ? Number(data.ticketId) : NaN;
      if (nTicketId === ticketIdNum) {
        if (await markAsRead(n.id)) count++;
      }
    } catch {
      // ignore parse errors
    }
  }
  return count;
}

/**
 * Marcar todas as notificações support_reply do usuário como lidas (ex.: ao abrir a página de suporte).
 */
export async function markAllSupportRepliesAsRead(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const unread = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, "support_reply"),
          eq(notifications.isRead, false)
        )
      );

    let count = 0;
    for (const row of unread) {
      if (await markAsRead(row.id)) count++;
    }
    return count;
  } catch (error) {
    console.error("[NotificationService] Error marking all support replies as read:", error);
    return 0;
  }
}

/**
 * Contar notificações support_reply não lidas do usuário (para badge).
 */
export async function getUnreadSupportCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, "support_reply"),
          eq(notifications.isRead, false)
        )
      );
    return result.length;
  } catch (error) {
    console.error("[NotificationService] Error counting unread support:", error);
    return 0;
  }
}

/**
 * Registrar uma subscrição de push notification
 */
export async function subscribeToPushNotifications(
  userId: number,
  subscription: PushSubscriptionJSON
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Verificar se já existe subscrição para este endpoint
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      // Atualizar subscrição existente
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
      // Criar nova subscrição
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        isActive: true,
      });
    }

    return true;
  } catch (error) {
    console.error("[NotificationService] Error subscribing to push notifications:", error);
    return false;
  }
}

/**
 * Obter todas as subscrições de push do usuário
 */
export async function getPushSubscriptions(userId: number): Promise<PushSubscriptionJSON[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));

    return subs.map((sub) => ({
      endpoint: sub.endpoint,
      keys: {
        auth: sub.auth,
        p256dh: sub.p256dh,
      },
    })) as PushSubscriptionJSON[];
  } catch (error) {
    console.error("[NotificationService] Error fetching push subscriptions:", error);
    return [];
  }
}

/**
 * Remover subscrição de push notification
 */
export async function unsubscribeFromPushNotifications(endpoint: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(pushSubscriptions)
      .set({ isActive: false })
      .where(eq(pushSubscriptions.endpoint, endpoint));

    return true;
  } catch (error) {
    console.error("[NotificationService] Error unsubscribing from push notifications:", error);
    return false;
  }
}

/**
 * Enviar notificação push para um usuário
 */
export async function sendPushNotification(
  userId: number,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const subscriptions = await getPushSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log("[NotificationService] No push subscriptions found for user:", userId);
      return false;
    }

    // Aqui você integraria com a biblioteca web-push
    // Para agora, apenas logamos que seria enviado
    console.log("[NotificationService] Would send push notification to", subscriptions.length, "devices");

    return true;
  } catch (error) {
    console.error("[NotificationService] Error sending push notification:", error);
    return false;
  }
}

/**
 * Criar notificação de novo lead
 */
export async function notifyNewLead(userId: number, leadData: { name?: string; phone?: string; neighborhood?: string }) {
  return createNotification({
    userId,
    type: "new_lead",
    title: "🎯 Novo Lead Capturado!",
    message: `Novo lead de ${leadData.name || "cliente"} em ${leadData.neighborhood || "área desejada"}`,
    data: leadData,
  });
}

/**
 * Criar notificação de alerta de quota
 */
export async function notifyQuotaWarning(userId: number, usagePercent: number, quotaType: "leads" | "api_calls") {
  const typeLabel = quotaType === "leads" ? "leads" : "chamadas de API";
  
  return createNotification({
    userId,
    type: "quota_warning",
    title: "⚠️ Quota Próxima do Limite",
    message: `Você atingiu ${usagePercent}% de sua quota de ${typeLabel} este mês`,
    data: { usagePercent, quotaType },
  });
}

/**
 * Criar notificação de quota excedida
 */
export async function notifyQuotaExceeded(userId: number, quotaType: "leads" | "api_calls") {
  const typeLabel = quotaType === "leads" ? "leads" : "chamadas de API";
  
  return createNotification({
    userId,
    type: "quota_exceeded",
    title: "❌ Quota Excedida",
    message: `Você atingiu o limite de ${typeLabel} para este mês. Atualize seu plano para continuar.`,
    data: { quotaType },
  });
}

/**
 * Criar notificação de pagamento falho
 */
export async function notifyPaymentFailed(userId: number, reason: string) {
  return createNotification({
    userId,
    type: "payment_failed",
    title: "💳 Falha no Pagamento",
    message: `Seu pagamento falhou: ${reason}. Por favor, atualize seus dados de pagamento.`,
    data: { reason },
  });
}

/**
 * Criar notificação de novo ticket (para Admin)
 */
export async function notifyNewTicket(adminId: number, ticketData: { id: number; subject: string; userName: string }) {
  return createNotification({
    userId: adminId,
    type: "new_support_ticket",
    title: "🎫 Novo Ticket de Suporte",
    message: `${ticketData.userName} abriu um novo ticket: ${ticketData.subject}`,
    data: ticketData,
  });
}

/**
 * Criar notificação de resposta no suporte (para Usuário ou Admin)
 */
export async function notifySupportReply(userId: number, replyData: { ticketId: number; subject: string; senderName: string }) {
  return createNotification({
    userId,
    type: "support_reply",
    title: "💬 Nova Resposta no Suporte",
    message: `${replyData.senderName} respondeu ao ticket: ${replyData.subject}`,
    data: replyData,
  });
}

// Type definition for PushSubscriptionJSON
interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

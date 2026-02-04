import {
  serial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const organizationRoleEnum = pgEnum("organization_role", ["member", "admin", "owner"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled", "unpaid"]);
export const objectiveEnum = pgEnum("objective", ["buy", "rent", "sell", "unknown"]);
export const urgencyEnum = pgEnum("urgency", ["cold", "warm", "hot"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "lost", "converted"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "created",
  "contacted",
  "response_sent",
  "status_changed",
  "note_added",
  "call_logged",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "new_lead",
  "quota_warning",
  "quota_exceeded",
  "payment_failed",
  "subscription_updated",
  "lead_status_changed",
  "system_alert",
  "support_reply",
  "new_support_ticket",
]);
export const planEnum = pgEnum("plan", ["free", "starter", "professional", "enterprise"]);

/**
 * Core user table backing auth flow.
 * Extended with API Key and billing information.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }).unique(),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: roleEnum("role").default("user").notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    emailVerified: boolean("emailVerified").default(false),
    emailVerificationToken: varchar("emailVerificationToken", { length: 255 }),
    emailVerificationExpires: timestamp("emailVerificationExpires"),
    passwordResetToken: varchar("passwordResetToken", { length: 255 }),
    passwordResetExpires: timestamp("passwordResetExpires"),
    googleId: varchar("googleId", { length: 255 }).unique(),
    apiKey: varchar("apiKey", { length: 128 }).unique(),
    captureToken: varchar("captureToken", { length: 64 }).unique(),
    captureFormSettings: text("captureFormSettings"), // JSON: companyName, logoUrl, primaryColor, buttonText, thankYouMessage, showPoweredBy
    organizationId: integer("organizationId"),
    organizationRole: organizationRoleEnum("organizationRole").default("member"),
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    apiKeyIdx: uniqueIndex("api_key_idx").on(table.apiKey),
    organizationIdx: index("organization_idx").on(table.organizationId),
    stripeCustomerIdx: index("stripe_customer_idx").on(table.stripeCustomerId),
    emailIdx: index("email_idx").on(table.email),
    googleIdIdx: uniqueIndex("google_id_idx").on(table.googleId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations (Imobiliárias)
 */
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  website: varchar("website", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Billing Plans
 */
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  planType: planEnum("plan_type").default("free").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  stripePriceId: varchar("stripePriceId", { length: 255 }).notNull().unique(),
  monthlyLeadsQuota: integer("monthlyLeadsQuota").notNull(),
  monthlyApiCalls: integer("monthlyApiCalls").notNull(),
  priceInCents: integer("priceInCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  features: text("features"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * User Subscriptions
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    planId: integer("planId").notNull(),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull().unique(),
    status: subscriptionStatusEnum("status").default("active"),
    currentPeriodStart: timestamp("currentPeriodStart").notNull(),
    currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
    canceledAt: timestamp("canceledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("subscription_user_idx").on(table.userId),
    stripeIdx: uniqueIndex("stripe_subscription_idx").on(table.stripeSubscriptionId),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Usage Tracking for Quotas
 */
export const usageTracking = pgTable(
  "usageTracking",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    leadsCreated: integer("leadsCreated").default(0),
    apiCallsMade: integer("apiCallsMade").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userMonthIdx: uniqueIndex("user_month_idx").on(table.userId, table.month),
  })
);

export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;

/**
 * Leads (Imobiliários)
 * Colunas em camelCase (banco criado com db:push ou migrations em camelCase).
 */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    organizationId: integer("organizationId"),
    name: varchar("name", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 320 }),
    objective: objectiveEnum("objective"),
    propertyType: varchar("propertyType", { length: 255 }),
    neighborhood: varchar("neighborhood", { length: 255 }),
    budget: varchar("budget", { length: 255 }),
    urgency: urgencyEnum("urgency").default("cold"),
    score: numeric("score", { precision: 3, scale: 2 }).default("0.00"),
    summary: text("summary"),
    suggestedResponse: text("suggestedResponse"),
    rawConversation: text("rawConversation"),
    status: leadStatusEnum("status").default("new"),
    source: varchar("source", { length: 255 }).default("whatsapp_extension"),
    qualificationChecklist: text("qualificationChecklist"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("lead_user_idx").on(table.userId),
    organizationIdx: index("lead_organization_idx").on(table.organizationId),
    createdAtIdx: index("lead_created_at_idx").on(table.createdAt),
    statusIdx: index("lead_status_idx").on(table.status),
  })
);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Lead Activities (for tracking interactions)
 */
export const leadActivities = pgTable(
  "leadActivities",
  {
    id: serial("id").primaryKey(),
    leadId: integer("leadId").notNull(),
    userId: integer("userId").notNull(),
    activityType: activityTypeEnum("activity_type").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    leadIdx: index("activity_lead_idx").on(table.leadId),
    userIdx: index("activity_user_idx").on(table.userId),
  })
);

export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = typeof leadActivities.$inferInsert;

/**
 * API Rate Limiting
 */
export const rateLimitLog = pgTable(
  "rateLimitLog",
  {
    id: serial("id").primaryKey(),
    apiKey: varchar("apiKey", { length: 128 }).notNull(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    requestCount: integer("requestCount").default(1),
    windowStart: timestamp("windowStart").notNull(),
    windowEnd: timestamp("windowEnd").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    apiKeyEndpointIdx: uniqueIndex("apikey_endpoint_idx").on(table.apiKey, table.endpoint, table.windowStart),
  })
);

export type RateLimitLog = typeof rateLimitLog.$inferSelect;
export type InsertRateLimitLog = typeof rateLimitLog.$inferInsert;

/**
 * Push Notification Subscriptions
 */
export const pushSubscriptions = pgTable(
  "pushSubscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    endpoint: varchar("endpoint", { length: 2048 }).notNull(),
    auth: varchar("auth", { length: 255 }).notNull(),
    p256dh: varchar("p256dh", { length: 255 }).notNull(),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("push_user_idx").on(table.userId),
    endpointIdx: uniqueIndex("push_endpoint_idx").on(table.endpoint),
  })
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Notifications (in-app and push)
 */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    data: text("data"),
    isRead: boolean("isRead").default(false),
    isPushed: boolean("isPushed").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("notification_user_idx").on(table.userId),
    typeIdx: index("notification_type_idx").on(table.type),
    createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Audit Log (já existe no DB)
 */
export const auditLog = pgTable("auditLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 255 }),
  entityId: integer("entityId"),
  oldValues: text("oldValues"),
  newValues: text("newValues"),
  ipAddress: varchar("ipAddress", { length: 255 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * Webhooks – nomes das colunas no banco (camelCase ou snake_case conforme o que existir no DB).
 * Se o erro for "user_id does not exist", o banco tem "userId"; use integer("userId").
 */
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  events: text("events").notNull(),
  secret: varchar("secret", { length: 128 }),
  isActive: boolean("isActive").default(true),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  failureCount: integer("failureCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// ============================================================================
// SENTIMENT ANALYSIS ENUMS
// ============================================================================
export const sentimentEnum = pgEnum("sentiment", ["positive", "negative", "neutral"]);
export const sentimentUrgencyEnum = pgEnum("sentiment_urgency", ["low", "medium", "high"]);
export const sentimentToneEnum = pgEnum("sentiment_tone", ["friendly", "frustrated", "neutral", "excited"]);

// ============================================================================
// SENTIMENT ANALYSIS TABLES
// ============================================================================

/**
 * Sentiment Analyses - Análise de sentimento de mensagens
 */
export const sentimentAnalyses = pgTable(
  "sentimentAnalyses",
  {
    id: serial("id").primaryKey(),
    conversationId: varchar("conversationId", { length: 255 }).notNull(),
    message: text("message").notNull(),
    sentiment: sentimentEnum("sentiment").notNull(),
    score: numeric("score", { precision: 3, scale: 2 }).notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(),
    keywords: text("keywords").notNull(),
    urgency: sentimentUrgencyEnum("urgency").notNull(),
    emotions: text("emotions"),
    tone: sentimentToneEnum("tone"),
    suggestedResponse: text("suggestedResponse"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("sentiment_conversation_idx").on(table.conversationId),
    sentimentIdx: index("sentiment_sentiment_idx").on(table.sentiment),
    urgencyIdx: index("sentiment_urgency_idx").on(table.urgency),
    createdAtIdx: index("sentiment_created_at_idx").on(table.createdAt),
  })
);

export type SentimentAnalysis = typeof sentimentAnalyses.$inferSelect;
export type InsertSentimentAnalysis = typeof sentimentAnalyses.$inferInsert;

/**
 * Conversation Summaries - Resumos agregados de conversas
 */
export const conversationSummaries = pgTable(
  "conversation_summaries",
  {
    id: serial("id").primaryKey(),
    conversationId: varchar("conversation_id", { length: 255 }).notNull().unique(),
    totalMessages: integer("total_messages").default(0),
    positiveCount: integer("positive_count").default(0),
    negativeCount: integer("negative_count").default(0),
    neutralCount: integer("neutral_count").default(0),
    averageScore: numeric("average_score", { precision: 3, scale: 2 }).default("0.50"),
    sentimentTrend: varchar("sentiment_trend", { length: 20 }), // improving, declining, stable
    overallSatisfaction: varchar("overall_satisfaction", { length: 50 }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: uniqueIndex("summary_conversation_idx").on(table.conversationId),
  })
);

export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type InsertConversationSummary = typeof conversationSummaries.$inferInsert;

/**
 * Sentiment Alerts - Alertas de sentimento para atendentes
 */
export const sentimentAlerts = pgTable(
  "sentimentAlerts",
  {
    id: serial("id").primaryKey(),
    conversationId: varchar("conversationId", { length: 255 }).notNull(),
    messageId: varchar("messageId", { length: 255 }).notNull(),
    sentiment: sentimentEnum("sentiment").notNull(),
    urgency: sentimentUrgencyEnum("urgency").notNull(),
    alertSent: boolean("alertSent").default(false),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("alert_conversation_idx").on(table.conversationId),
    urgencyIdx: index("alert_urgency_idx").on(table.urgency),
    alertSentIdx: index("alert_sent_idx").on(table.alertSent),
    createdAtIdx: index("alert_created_at_idx").on(table.createdAt),
  })
);

export type SentimentAlert = typeof sentimentAlerts.$inferSelect;
export type InsertSentimentAlert = typeof sentimentAlerts.$inferInsert;

// ============================================================================
// SUPPORT TICKETS ENUMS
// ============================================================================
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "pending", "resolved"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high"]);

// ============================================================================
// SUPPORT TICKETS TABLES
// ============================================================================

/**
 * Support Tickets - Tickets de suporte dos usuários
 */
export const supportTickets = pgTable(
  "supportTickets",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    status: ticketStatusEnum("status").default("open").notNull(),
    priority: ticketPriorityEnum("priority").default("medium").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
  },
  (table) => ({
    userIdx: index("ticket_user_idx").on(table.userId),
    statusIdx: index("ticket_status_idx").on(table.status),
    priorityIdx: index("ticket_priority_idx").on(table.priority),
    createdAtIdx: index("ticket_created_at_idx").on(table.createdAt),
  })
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Support Messages - Mensagens dentro dos tickets
 */
export const supportMessages = pgTable(
  "supportMessages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticketId").notNull(),
    userId: integer("userId"),
    senderType: varchar("senderType", { length: 20 }).notNull(), // 'user' ou 'admin'
    message: text("message").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    ticketIdx: index("message_ticket_idx").on(table.ticketId),
    userIdx: index("message_user_idx").on(table.userId),
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  })
);

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;

/**
 * Appointments (Agendamentos)
 * Colunas em snake_case para compatibilidade com a migration 0000.
 */
export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    leadId: integer("lead_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 50 }).default("visit"), // visit, call, meeting
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, completed, canceled
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("appointment_user_idx").on(table.userId),
    leadIdx: index("appointment_lead_idx").on(table.leadId),
    startTimeIdx: index("appointment_start_time_idx").on(table.startTime),
  })
);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ============================================================================
// AUTOMATIONS (regras automáticas do usuário)
// ============================================================================

/**
 * Automações – gatilho + condições + ação, alinhado à tela CreateAutomation.
 * Colunas em snake_case no banco (igual webhooks).
 */
export const automations = pgTable(
  "automations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    trigger: varchar("trigger", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    message: text("message"),
    conditions: text("conditions").notNull(), // JSON: Array<{ field, operator, value }>
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("automation_user_idx").on(table.userId),
    isActiveIdx: index("automation_is_active_idx").on(table.isActive),
  })
);

export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = typeof automations.$inferInsert;

/**
 * OpenClaw Automation Settings
 * Exclusivo para planos Professional e Enterprise.
 * Tabela e colunas em snake_case para compatibilidade com PostgreSQL.
 */
export const openClawAutomations = pgTable(
  "open_claw_automations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    triggerEvent: varchar("trigger_event", { length: 100 }).notNull(),
    minScore: numeric("min_score", { precision: 3, scale: 2 }).default("0.00"),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    actionConfig: text("action_config"),
    executionMode: varchar("execution_mode", { length: 50 }).default("manual_approval"), // NOVO
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("openclaw_automation_user_idx").on(table.userId),
  })
);

export type OpenClawAutomation = typeof openClawAutomations.$inferSelect;
export type InsertOpenClawAutomation = typeof openClawAutomations.$inferInsert;

/**
 * Histórico de conversas do Copiloto IA (OpenClaw).
 * Múltiplas conversas por usuário; mensagens append-only.
 */
export const aiCopilotConversations = pgTable(
  "ai_copilot_conversations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: varchar("title", { length: 120 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userUpdatedIdx: index("ai_copilot_conv_user_updated_idx").on(table.userId, table.updatedAt),
  })
);

export const aiCopilotMessages = pgTable(
  "ai_copilot_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("ai_copilot_msg_conv_idx").on(table.conversationId),
    createdAtIdx: index("ai_copilot_msg_created_idx").on(table.createdAt),
  })
);

export type AiCopilotConversation = typeof aiCopilotConversations.$inferSelect;
export type InsertAiCopilotConversation = typeof aiCopilotConversations.$inferInsert;
export type AiCopilotMessage = typeof aiCopilotMessages.$inferSelect;
export type InsertAiCopilotMessage = typeof aiCopilotMessages.$inferInsert;

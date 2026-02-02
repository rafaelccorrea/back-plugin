/**
 * Gera os paths OpenAPI para cada procedimento tRPC, para que todas as rotas
 * apareçam individualmente no Swagger (não só /api/trpc/{path} genérico).
 *
 * Formato tRPC: GET ou POST /api/trpc/router.procedure
 * - Queries: normalmente GET (ou POST com body)
 * - Mutations: POST com body { "0": { "json": input } }
 */

type Method = "get" | "post";

interface TrpcProcedure {
  path: string; // ex: auth.login
  method: Method;
  summary: string;
  description?: string;
  requestSchemaRef?: string;
  responseSchemaRef?: string;
  tag: string;
}

const procedures: TrpcProcedure[] = [
  // System
  { path: "system.health", method: "get", summary: "Health check", tag: "System", requestSchemaRef: undefined },
  { path: "system.notifyOwner", method: "post", summary: "Notificar owner (admin)", tag: "System" },
  // Auth
  { path: "auth.logout", method: "post", summary: "Logout", tag: "Auth" },
  { path: "auth.register", method: "post", summary: "Registrar usuário", tag: "Auth", requestSchemaRef: "AuthRegisterInput", responseSchemaRef: "AuthRegisterResponse" },
  { path: "auth.login", method: "post", summary: "Login", tag: "Auth", requestSchemaRef: "AuthLoginInput", responseSchemaRef: "AuthLoginResponse" },
  { path: "auth.refresh", method: "post", summary: "Refresh token (tRPC)", tag: "Auth", requestSchemaRef: "AuthRefreshInput", responseSchemaRef: "AuthRefreshResponse" },
  { path: "auth.verifyEmail", method: "post", summary: "Verificar email", tag: "Auth", requestSchemaRef: "AuthVerifyEmailInput" },
  { path: "auth.resendVerification", method: "post", summary: "Reenviar email de verificação", tag: "Auth", requestSchemaRef: "AuthResendVerificationInput" },
  { path: "auth.forgotPassword", method: "post", summary: "Esqueci minha senha", tag: "Auth", requestSchemaRef: "AuthForgotPasswordInput" },
  { path: "auth.validateResetToken", method: "get", summary: "Validar token de reset", tag: "Auth", requestSchemaRef: "AuthValidateResetTokenInput", responseSchemaRef: "AuthValidateResetTokenResponse" },
  { path: "auth.resetPassword", method: "post", summary: "Redefinir senha com token", tag: "Auth", requestSchemaRef: "AuthResetPasswordInput" },
  { path: "auth.changePassword", method: "post", summary: "Alterar senha (logado)", tag: "Auth", requestSchemaRef: "AuthChangePasswordInput" },
  { path: "auth.me", method: "get", summary: "Usuário atual", tag: "Auth", responseSchemaRef: "AuthMeResponse" },
  { path: "auth.regenerateApiKey", method: "post", summary: "Regenerar API Key", tag: "Auth" },
  // Leads
  { path: "leads.analyze", method: "post", summary: "Analisar conversa (IA)", tag: "Leads", requestSchemaRef: "AnalyzePayloadInput" },
  { path: "leads.list", method: "get", summary: "Listar leads", tag: "Leads", requestSchemaRef: "LeadListInput", responseSchemaRef: "LeadListResponse" },
  { path: "leads.getById", method: "get", summary: "Obter lead por ID", tag: "Leads", requestSchemaRef: undefined, responseSchemaRef: "LeadDto" },
  { path: "leads.update", method: "post", summary: "Atualizar lead", tag: "Leads", requestSchemaRef: "LeadUpdateDto", responseSchemaRef: "LeadDto" },
  { path: "leads.getMonthlyUsage", method: "get", summary: "Uso mensal", tag: "Leads", responseSchemaRef: "LeadsMonthlyUsageResponse" },
  { path: "leads.getStats", method: "get", summary: "Estatísticas de leads", tag: "Leads", responseSchemaRef: "LeadsMonthlyUsageResponse" },
  // Billing
  { path: "billing.getSubscription", method: "get", summary: "Assinatura do usuário", tag: "Billing", responseSchemaRef: "BillingSubscriptionDto" },
  { path: "billing.getUsage", method: "get", summary: "Uso e quotas", tag: "Billing", responseSchemaRef: "BillingUsageDto" },
  { path: "billing.checkQuotaLimits", method: "get", summary: "Verificar limites de cota", tag: "Billing", responseSchemaRef: "CheckQuotaLimitsDto" },
  // Checkout
  { path: "checkout.createCheckoutSession", method: "post", summary: "Criar sessão de checkout", tag: "Checkout", requestSchemaRef: "CreateCheckoutSessionInput", responseSchemaRef: "CreateCheckoutSessionResponse" },
  { path: "checkout.getBillingInfo", method: "get", summary: "Info de billing", tag: "Checkout" },
  { path: "checkout.updateSubscription", method: "post", summary: "Atualizar plano", tag: "Checkout", requestSchemaRef: "UpdateSubscriptionInput" },
  { path: "checkout.cancelSubscription", method: "post", summary: "Cancelar assinatura", tag: "Checkout", requestSchemaRef: "CancelSubscriptionInput" },
  { path: "checkout.createBillingPortalSession", method: "post", summary: "Portal de billing Stripe", tag: "Checkout", requestSchemaRef: "CreateBillingPortalSessionInput" },
  { path: "checkout.listPlans", method: "get", summary: "Listar planos", tag: "Checkout", responseSchemaRef: "PlanDto" },
  // Notifications
  { path: "notifications.getAdminNotifications", method: "get", summary: "Notificações do admin", tag: "Notifications", requestSchemaRef: "PaginationInput" },
  { path: "notifications.sendNotification", method: "post", summary: "Enviar notificação (admin)", tag: "Notifications" },
  { path: "notifications.getAdminUnreadCount", method: "get", summary: "Contagem não lidas (admin)", tag: "Notifications" },
  { path: "notifications.subscribe", method: "post", summary: "Inscrever em notificações", tag: "Notifications" },
  { path: "notifications.unsubscribe", method: "post", summary: "Desinscrever", tag: "Notifications" },
  { path: "notifications.list", method: "get", summary: "Listar notificações", tag: "Notifications", requestSchemaRef: "ListNotificationsInput" },
  { path: "notifications.getUnread", method: "get", summary: "Não lidas do usuário", tag: "Notifications" },
  { path: "notifications.markAsRead", method: "post", summary: "Marcar como lida", tag: "Notifications", requestSchemaRef: "MarkAsReadInput" },
  { path: "notifications.markAllAsRead", method: "post", summary: "Marcar todas como lidas", tag: "Notifications" },
  { path: "notifications.testNotification", method: "post", summary: "Testar notificação", tag: "Notifications" },
  // Sentiment
  { path: "sentiment.analyze", method: "post", summary: "Analisar sentimento", tag: "Sentiment", requestSchemaRef: "AnalyzeSentimentInput", responseSchemaRef: "AnalyzeSentimentResponse" },
  { path: "sentiment.analyzeBatch", method: "post", summary: "Analisar sentimento (batch)", tag: "Sentiment", requestSchemaRef: "AnalyzeBatchSentimentInput" },
  { path: "sentiment.suggestResponse", method: "post", summary: "Sugerir resposta", tag: "Sentiment" },
  { path: "sentiment.getStats", method: "get", summary: "Estatísticas de sentimento", tag: "Sentiment" },
  { path: "sentiment.checkAlert", method: "post", summary: "Verificar alerta", tag: "Sentiment" },
  // Escalation
  { path: "escalation.checkEscalation", method: "post", summary: "Verificar se deve escalar", tag: "Escalation", requestSchemaRef: "CheckEscalationInput" },
  { path: "escalation.createAlert", method: "post", summary: "Criar alerta de escalação", tag: "Escalation", requestSchemaRef: "CreateEscalationAlertInput" },
  { path: "escalation.getActiveAlerts", method: "get", summary: "Alertas ativos", tag: "Escalation" },
  { path: "escalation.resolveAlert", method: "post", summary: "Resolver alerta", tag: "Escalation" },
  { path: "escalation.getStats", method: "get", summary: "Stats de escalação", tag: "Escalation" },
  { path: "escalation.getAvailableAttendants", method: "get", summary: "Atendentes disponíveis", tag: "Escalation" },
  { path: "escalation.getAllAttendants", method: "get", summary: "Todos os atendentes", tag: "Escalation" },
  { path: "escalation.updateAttendantStatus", method: "post", summary: "Atualizar status do atendente", tag: "Escalation", requestSchemaRef: "UpdateAttendantStatusInput" },
  { path: "escalation.incrementConversation", method: "post", summary: "Incrementar conversa ativa", tag: "Escalation" },
  { path: "escalation.decrementConversation", method: "post", summary: "Decrementar conversa ativa", tag: "Escalation" },
  // Admin
  { path: "admin.getUsers", method: "get", summary: "Listar usuários (admin)", tag: "Admin", requestSchemaRef: "AdminGetUsersInput" },
  { path: "admin.banUser", method: "post", summary: "Banir usuário (admin)", tag: "Admin", requestSchemaRef: "AdminBanUserInput" },
  { path: "admin.unbanUser", method: "post", summary: "Desbanir usuário (admin)", tag: "Admin" },
  { path: "admin.deleteUser", method: "post", summary: "Excluir usuário (admin)", tag: "Admin" },
  { path: "admin.getStats", method: "get", summary: "Estatísticas (admin)", tag: "Admin" },
  // Admin Billing
  { path: "adminBilling.getStats", method: "get", summary: "Stats de billing (admin)", tag: "Admin Billing" },
  { path: "adminBilling.getTransactions", method: "get", summary: "Transações (admin)", tag: "Admin Billing" },
  { path: "adminBilling.getSubscriptions", method: "get", summary: "Assinaturas (admin)", tag: "Admin Billing" },
  { path: "adminBilling.refundTransaction", method: "post", summary: "Reembolsar transação (admin)", tag: "Admin Billing" },
  { path: "adminBilling.syncStripeData", method: "post", summary: "Sincronizar dados Stripe (admin)", tag: "Admin Billing" },
  // Support
  { path: "support.getUserTickets", method: "get", summary: "Tickets do usuário", tag: "Support" },
  { path: "support.getTickets", method: "get", summary: "Todos os tickets (admin)", tag: "Support" },
  { path: "support.getTicket", method: "get", summary: "Ticket por ID", tag: "Support", responseSchemaRef: "SupportTicketDto" },
  { path: "support.createTicket", method: "post", summary: "Criar ticket", tag: "Support" },
  { path: "support.addMessage", method: "post", summary: "Adicionar mensagem ao ticket", tag: "Support", requestSchemaRef: "SupportCreateReplyInput" },
  { path: "support.updateTicketStatus", method: "post", summary: "Atualizar status do ticket (admin)", tag: "Support", requestSchemaRef: "SupportUpdateTicketStatusInput" },
  { path: "support.getStats", method: "get", summary: "Stats de suporte (admin)", tag: "Support" },
  { path: "support.syncData", method: "post", summary: "Sincronizar dados (admin)", tag: "Support" },
  // Analytics
  { path: "analytics.getOverview", method: "get", summary: "Visão geral (admin)", tag: "Analytics", responseSchemaRef: "AnalyticsOverviewDto" },
  { path: "analytics.getUserGrowth", method: "get", summary: "Crescimento de usuários (admin)", tag: "Analytics" },
  { path: "analytics.getLeadsByStatus", method: "get", summary: "Leads por status (admin)", tag: "Analytics" },
  { path: "analytics.getUserActivity", method: "get", summary: "Atividade de usuários (admin)", tag: "Analytics" },
  { path: "analytics.getTopUsers", method: "get", summary: "Top usuários (admin)", tag: "Analytics" },
  { path: "analytics.getSystemHealth", method: "get", summary: "Saúde do sistema (admin)", tag: "Analytics" },
  { path: "analytics.getMetrics", method: "get", summary: "Métricas do usuário", tag: "Analytics" },
  // AI
  { path: "ai.chat", method: "post", summary: "Chat com IA", tag: "AI", requestSchemaRef: "AiChatInput", responseSchemaRef: "AiChatResponse" },
  { path: "ai.suggestResponse", method: "get", summary: "Sugerir resposta para lead", tag: "AI", requestSchemaRef: "AiSuggestResponseInput" },
  // Stripe Sync
  { path: "stripeSync.syncSubscription", method: "post", summary: "Sincronizar assinatura", tag: "Stripe Sync" },
  { path: "stripeSync.checkPaymentStatus", method: "get", summary: "Status do pagamento", tag: "Stripe Sync" },
  { path: "stripeSync.syncAllUsers", method: "post", summary: "Sincronizar todos (admin)", tag: "Stripe Sync" },
  { path: "stripeSync.getPaymentHistory", method: "get", summary: "Histórico de pagamentos", tag: "Stripe Sync" },
  // Appointments
  { path: "appointments.create", method: "post", summary: "Criar agendamento", tag: "Appointments", requestSchemaRef: "AppointmentCreateInput", responseSchemaRef: "AppointmentDto" },
  { path: "appointments.update", method: "post", summary: "Atualizar agendamento", tag: "Appointments", requestSchemaRef: "AppointmentUpdateInput" },
  { path: "appointments.list", method: "get", summary: "Listar agendamentos", tag: "Appointments", requestSchemaRef: "AppointmentListInput" },
  { path: "appointments.getUpcoming", method: "get", summary: "Próximos agendamentos", tag: "Appointments" },
  // Webhooks (tRPC – também existe REST /api/webhooks.externalLead)
  { path: "webhooks.externalLead", method: "post", summary: "Webhook lead externo (tRPC)", tag: "Webhooks", requestSchemaRef: "ExternalLeadInput", responseSchemaRef: "ExternalLeadResponse" },
  // Integrations
  { path: "integrations.getWebhookConfig", method: "get", summary: "Config do webhook", tag: "Integrations", responseSchemaRef: "WebhookConfigDto" },
  { path: "integrations.setWebhookConfig", method: "post", summary: "Configurar webhook", tag: "Integrations", requestSchemaRef: "SetWebhookConfigInput" },
  { path: "integrations.disableWebhook", method: "post", summary: "Desativar webhook", tag: "Integrations" },
  { path: "integrations.canUseIntegrations", method: "get", summary: "Pode usar integrações", tag: "Integrations" },
  // Automations
  { path: "automations.list", method: "get", summary: "Listar automações", tag: "Automations", responseSchemaRef: "AutomationDto" },
  { path: "automations.get", method: "get", summary: "Automação por ID", tag: "Automations", responseSchemaRef: "AutomationDto" },
  { path: "automations.create", method: "post", summary: "Criar automação", tag: "Automations", requestSchemaRef: "CreateAutomationInput", responseSchemaRef: "AutomationDto" },
  { path: "automations.update", method: "post", summary: "Atualizar automação", tag: "Automations", requestSchemaRef: "UpdateAutomationInput" },
  { path: "automations.delete", method: "post", summary: "Excluir automação", tag: "Automations" },
  // OpenClaw Automations
  { path: "openClawAutomations.list", method: "get", summary: "Listar automações OpenClaw", tag: "OpenClaw" },
  { path: "openClawAutomations.create", method: "post", summary: "Criar automação OpenClaw", tag: "OpenClaw", requestSchemaRef: "OpenClawAutomationInput" },
  { path: "openClawAutomations.update", method: "post", summary: "Atualizar automação OpenClaw", tag: "OpenClaw", requestSchemaRef: "OpenClawAutomationUpdateInput" },
  { path: "openClawAutomations.delete", method: "post", summary: "Excluir automação OpenClaw", tag: "OpenClaw" },
  // AI Assistant
  { path: "aiAssistant.listConversations", method: "get", summary: "Listar conversas do copiloto", tag: "AI Assistant", responseSchemaRef: "AiAssistantConversationDto" },
  { path: "aiAssistant.createNewConversation", method: "post", summary: "Nova conversa", tag: "AI Assistant" },
  { path: "aiAssistant.getHistory", method: "get", summary: "Histórico da conversa", tag: "AI Assistant" },
  { path: "aiAssistant.clearHistory", method: "post", summary: "Limpar histórico", tag: "AI Assistant" },
  { path: "aiAssistant.deleteConversation", method: "post", summary: "Excluir conversa", tag: "AI Assistant" },
  { path: "aiAssistant.chat", method: "post", summary: "Chat com copiloto", tag: "AI Assistant", requestSchemaRef: "AiAssistantChatInput" },
  { path: "aiAssistant.executeAction", method: "post", summary: "Executar ação do copiloto", tag: "AI Assistant" },
];

function buildTrpcPathItem(proc: TrpcProcedure): Record<string, unknown> {
  const operation: Record<string, unknown> = {
    tags: [proc.tag],
    summary: proc.summary,
    description: [
      `Procedimento tRPC: \`${proc.path}\`.`,
      proc.responseSchemaRef && `Resposta: Components > Schemas > ${proc.responseSchemaRef}`,
      proc.requestSchemaRef && proc.method === "post" && `Request: Components > Schemas > ${proc.requestSchemaRef}`,
    ]
      .filter(Boolean)
      .join(" "),
    parameters: [] as Record<string, unknown>[],
    responses: {
      "200": {
        description: "OK",
        content: {
          "application/json": {
            schema: proc.responseSchemaRef
              ? { $ref: `#/components/schemas/${proc.responseSchemaRef}` }
              : { type: "object" },
          },
        },
      },
      "401": { description: "Não autorizado" },
      "400": { description: "Bad request" },
    },
  };

  if (proc.method === "post") {
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: proc.requestSchemaRef
            ? {
                type: "object",
                description: `Formato tRPC: { "0": { "json": <input> } }. Input em Components > Schemas: ${proc.requestSchemaRef}`,
                properties: {
                  "0": {
                    type: "object",
                    properties: {
                      json: { $ref: `#/components/schemas/${proc.requestSchemaRef}` },
                    },
                  },
                },
              }
            : {
                type: "object",
                description: 'Formato tRPC: { "0": { "json": <input> } }. Veja Components > Schemas para o DTO do procedimento.',
              },
        },
      },
    };
  } else if (proc.method === "get" && proc.requestSchemaRef) {
    (operation.parameters as Record<string, unknown>[]).push({
      name: "input",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: `JSON stringificado do input. Schema: Components > Schemas > ${proc.requestSchemaRef}`,
    });
  }

  if ((operation.parameters as unknown[]).length === 0) {
    delete operation.parameters;
  }

  return { [proc.method]: operation };
}

/** Paths OpenAPI para cada procedimento tRPC (rotas individuais no Swagger). */
export function buildTrpcPaths(): Record<string, Record<string, unknown>> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const proc of procedures) {
    const pathUrl = `/api/trpc/${proc.path}`;
    const pathItem = buildTrpcPathItem(proc);
    paths[pathUrl] = pathItem;
  }
  return paths;
}

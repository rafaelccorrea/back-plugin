/**
 * DTOs (Data Transfer Objects) para documentação OpenAPI/Swagger.
 * Espelham os inputs/outputs dos routers tRPC e rotas REST.
 * 100% do sistema documentado até os DTOs.
 */
export const schemas = {
  // ─── Erros e utilitários ─────────────────────────────────────────────────
  Error: {
    type: "object",
    description: "Resposta de erro padrão da API",
    properties: {
      error: {
        type: "object",
        properties: {
          message: { type: "string", description: "Mensagem de erro" },
          code: { type: "string", description: "Código do erro (ex: UNAUTHORIZED, BAD_REQUEST)" },
        },
      },
    },
  },
  SuccessMessage: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string" },
    },
  },
  PaginationInput: {
    type: "object",
    properties: {
      limit: { type: "number", default: 50, minimum: 1, maximum: 100 },
      offset: { type: "number", default: 0, minimum: 0 },
    },
  },

  // ─── Auth ─────────────────────────────────────────────────────────────────
  AuthRegisterInput: {
    type: "object",
    required: ["email", "password"],
    description: "DTO de registro de usuário",
    properties: {
      email: { type: "string", format: "email", description: "Email válido" },
      password: { type: "string", minLength: 8, description: "Mínimo 8 caracteres" },
      name: { type: "string", description: "Nome (opcional)" },
    },
  },
  AuthRegisterResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      message: { type: "string" },
      userId: { type: "number" },
    },
  },
  AuthLoginInput: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
    },
  },
  AuthLoginResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      message: { type: "string" },
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      user: { $ref: "#/components/schemas/UserSummary" },
    },
  },
  AuthRefreshInput: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string", description: "JWT refresh token" },
    },
  },
  AuthRefreshResponse: {
    type: "object",
    properties: {
      accessToken: { type: "string" },
    },
  },
  UserSummary: {
    type: "object",
    description: "Resumo do usuário (login/me)",
    properties: {
      id: { type: "number" },
      email: { type: "string", nullable: true },
      name: { type: "string", nullable: true },
      role: { type: "string", enum: ["user", "admin"] },
      plan: { type: "string", enum: ["free", "starter", "professional", "enterprise"] },
      subscriptionStatus: { type: "string", nullable: true },
    },
  },
  AuthMeResponse: {
    type: "object",
    nullable: true,
    description: "Usuário atual (null se não logado)",
    properties: {
      id: { type: "number" },
      email: { type: "string", nullable: true },
      name: { type: "string", nullable: true },
      role: { type: "string" },
      apiKey: { type: "string", nullable: true },
      emailVerified: { type: "boolean", nullable: true },
      plan: { type: "string" },
      subscriptionStatus: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  AuthVerifyEmailInput: {
    type: "object",
    required: ["token"],
    properties: { token: { type: "string" } },
  },
  AuthResendVerificationInput: {
    type: "object",
    required: ["email"],
    properties: { email: { type: "string", format: "email" } },
  },
  AuthForgotPasswordInput: {
    type: "object",
    required: ["email"],
    properties: { email: { type: "string", format: "email" } },
  },
  AuthValidateResetTokenInput: {
    type: "object",
    required: ["token"],
    properties: { token: { type: "string" } },
  },
  AuthValidateResetTokenResponse: {
    type: "object",
    properties: {
      valid: { type: "boolean" },
      email: { type: "string", nullable: true },
      message: { type: "string", nullable: true },
    },
  },
  AuthResetPasswordInput: {
    type: "object",
    required: ["token", "password"],
    properties: {
      token: { type: "string" },
      password: { type: "string", minLength: 8 },
    },
  },
  AuthChangePasswordInput: {
    type: "object",
    required: ["currentPassword", "newPassword"],
    properties: {
      currentPassword: { type: "string" },
      newPassword: { type: "string", minLength: 8 },
    },
  },

  // ─── Leads ────────────────────────────────────────────────────────────────
  AnalyzePayloadInput: {
    type: "object",
    required: ["apiKey", "conversation"],
    description: "Análise de conversa (extensão Chrome / API)",
    properties: {
      apiKey: { type: "string" },
      conversation: { type: "string", minLength: 10 },
      contactName: { type: "string" },
    },
  },
  LeadStatus: {
    type: "string",
    enum: ["new", "contacted", "qualified", "lost", "converted"],
  },
  LeadObjective: {
    type: "string",
    enum: ["buy", "rent", "sell", "unknown"],
  },
  LeadUrgency: {
    type: "string",
    enum: ["cold", "warm", "hot"],
  },
  LeadUpdateDto: {
    type: "object",
    description: "Campos atualizáveis de um lead",
    properties: {
      status: { $ref: "#/components/schemas/LeadStatus" },
      name: { type: "string" },
      phone: { type: "string" },
      email: { type: "string" },
      objective: { $ref: "#/components/schemas/LeadObjective" },
      propertyType: { type: "string" },
      neighborhood: { type: "string" },
      budget: { type: "string" },
      urgency: { $ref: "#/components/schemas/LeadUrgency" },
      notes: { type: "string" },
      qualificationChecklist: { type: "string" },
    },
  },
  LeadDto: {
    type: "object",
    description: "Lead completo",
    properties: {
      id: { type: "number" },
      name: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
      email: { type: "string", nullable: true },
      objective: { type: "string", nullable: true },
      propertyType: { type: "string", nullable: true },
      neighborhood: { type: "string", nullable: true },
      budget: { type: "string", nullable: true },
      urgency: { type: "string", nullable: true },
      score: { type: "string", nullable: true },
      summary: { type: "string", nullable: true },
      suggestedResponse: { type: "string", nullable: true },
      status: { $ref: "#/components/schemas/LeadStatus" },
      qualificationChecklist: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time", nullable: true },
    },
  },
  LeadListInput: {
    type: "object",
    properties: {
      limit: { type: "number", default: 50, minimum: 1, maximum: 100 },
      offset: { type: "number", default: 0, minimum: 0 },
    },
  },
  LeadListResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/LeadDto" },
      },
    },
  },
  ExternalLeadInput: {
    type: "object",
    required: ["apiKey"],
    description: "Webhook externo – captura de lead (Zapier, Make)",
    properties: {
      apiKey: { type: "string" },
      name: { type: "string" },
      phone: { type: "string" },
      email: { type: "string" },
      source: { type: "string", default: "external_webhook" },
      notes: { type: "string" },
      conversation: { type: "string", description: "Texto para análise por IA" },
    },
  },
  ExternalLeadResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      leadId: { type: "number" },
      message: { type: "string" },
    },
  },
  LeadsMonthlyUsageResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: {
        type: "object",
        properties: {
          leadsCreated: { type: "number" },
          apiCallsMade: { type: "number" },
          leadsQuota: { type: "number" },
          apiCallsQuota: { type: "number" },
        },
      },
    },
  },

  // ─── Billing & Checkout ───────────────────────────────────────────────────
  BillingSubscriptionDto: {
    type: "object",
    properties: {
      planId: { type: "string" },
      planName: { type: "string" },
      planDescription: { type: "string" },
      monthlyLeadsQuota: { type: "number" },
      monthlyApiCalls: { type: "number" },
      priceInCents: { type: "number" },
      currency: { type: "string" },
      subscriptionStatus: { type: "string" },
      currentPeriodStart: { type: "string", format: "date-time" },
      currentPeriodEnd: { type: "string", format: "date-time" },
    },
  },
  BillingUsageDto: {
    type: "object",
    properties: {
      leadsCreated: { type: "number" },
      leadsQuota: { type: "number" },
      leadsUsagePercent: { type: "number" },
      apiCallsMade: { type: "number" },
      apiCallsQuota: { type: "number" },
      apiCallsUsagePercent: { type: "number" },
    },
  },
  CheckQuotaLimitsDto: {
    type: "object",
    properties: {
      leadsLimitReached: { type: "boolean" },
      leadsCreated: { type: "number" },
      leadsQuota: { type: "number" },
      apiCallsLimitReached: { type: "boolean" },
      apiCallsMade: { type: "number" },
      apiCallsQuota: { type: "number" },
    },
  },
  CreateCheckoutSessionInput: {
    type: "object",
    required: ["planId", "successUrl", "cancelUrl"],
    properties: {
      planId: { type: "string", enum: ["starter", "professional", "enterprise"] },
      successUrl: { type: "string", format: "uri" },
      cancelUrl: { type: "string", format: "uri" },
    },
  },
  CreateCheckoutSessionResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          url: { type: "string", nullable: true },
        },
      },
    },
  },
  CreateBillingPortalSessionInput: {
    type: "object",
    required: ["returnUrl"],
    properties: {
      returnUrl: { type: "string", format: "uri" },
    },
  },
  UpdateSubscriptionInput: {
    type: "object",
    required: ["subscriptionId", "newPlanId"],
    properties: {
      subscriptionId: { type: "string" },
      newPlanId: { type: "string", enum: ["starter", "professional", "enterprise"] },
    },
  },
  CancelSubscriptionInput: {
    type: "object",
    required: ["subscriptionId"],
    properties: { subscriptionId: { type: "string" } },
  },
  PlanDto: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      monthlyLeadsQuota: { type: "number" },
      monthlyApiCalls: { type: "number" },
      priceInCents: { type: "number" },
      currency: { type: "string" },
    },
  },

  // ─── Notifications ───────────────────────────────────────────────────────
  NotificationDto: {
    type: "object",
    properties: {
      id: { type: "string" },
      type: { type: "string" },
      title: { type: "string" },
      message: { type: "string" },
      read: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      data: { type: "object", additionalProperties: true },
    },
  },
  ListNotificationsInput: {
    type: "object",
    properties: {
      limit: { type: "number", default: 20 },
      offset: { type: "number", default: 0 },
    },
  },
  MarkAsReadInput: {
    type: "object",
    required: ["notificationIds"],
    properties: {
      notificationIds: { type: "array", items: { type: "number" } },
    },
  },

  // ─── Automations ──────────────────────────────────────────────────────────
  AutomationConditionDto: {
    type: "object",
    properties: {
      field: { type: "string", enum: ["urgencia", "status", "plano", "origem"] },
      operator: { type: "string", enum: ["igual", "diferente", "contem"] },
      value: { type: "string" },
    },
  },
  CreateAutomationInput: {
    type: "object",
    required: ["name", "trigger", "action"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string", maxLength: 2000 },
      trigger: { type: "string", enum: ["novo_lead", "mensagem_recebida", "lead_qualificado", "lead_convertido"] },
      action: { type: "string", enum: ["enviar_mensagem", "qualificar_lead", "enviar_notificacao", "atualizar_status", "criar_tarefa"] },
      message: { type: "string", maxLength: 5000 },
      conditions: { type: "array", items: { $ref: "#/components/schemas/AutomationConditionDto" }, default: [] },
      isActive: { type: "boolean", default: true },
    },
  },
  UpdateAutomationInput: {
    type: "object",
    required: ["id"],
    description: "Atualização parcial de automação (todos os campos opcionais exceto id)",
    properties: {
      id: { type: "number", minimum: 1 },
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string", maxLength: 2000 },
      trigger: { type: "string", enum: ["novo_lead", "mensagem_recebida", "lead_qualificado", "lead_convertido"] },
      action: { type: "string", enum: ["enviar_mensagem", "qualificar_lead", "enviar_notificacao", "atualizar_status", "criar_tarefa"] },
      message: { type: "string", maxLength: 5000 },
      conditions: { type: "array", items: { $ref: "#/components/schemas/AutomationConditionDto" } },
      isActive: { type: "boolean" },
    },
  },
  AutomationDto: {
    type: "object",
    properties: {
      id: { type: "number" },
      userId: { type: "number" },
      name: { type: "string" },
      description: { type: "string", nullable: true },
      trigger: { type: "string" },
      action: { type: "string" },
      message: { type: "string", nullable: true },
      conditions: { type: "array", items: { $ref: "#/components/schemas/AutomationConditionDto" } },
      isActive: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time", nullable: true },
    },
  },

  // ─── Integrations (Webhook) ───────────────────────────────────────────────
  WebhookConfigDto: {
    type: "object",
    properties: {
      url: { type: "string", nullable: true },
      events: { type: "array", items: { type: "string" } },
      isActive: { type: "boolean" },
      lastTriggeredAt: { type: "string", format: "date-time", nullable: true },
      failureCount: { type: "number" },
      hasSecret: { type: "boolean" },
    },
  },
  SetWebhookConfigInput: {
    type: "object",
    required: ["url", "events"],
    properties: {
      url: { type: "string", format: "uri", maxLength: 2048 },
      events: { type: "array", items: { type: "string" }, minItems: 1 },
      secret: { type: "string", maxLength: 128 },
    },
  },

  // ─── Appointments ─────────────────────────────────────────────────────────
  AppointmentCreateInput: {
    type: "object",
    required: ["leadId", "title", "startTime"],
    properties: {
      leadId: { type: "number" },
      title: { type: "string" },
      description: { type: "string" },
      type: { type: "string", default: "visit" },
      startTime: { type: "string", format: "date-time" },
      endTime: { type: "string", format: "date-time" },
    },
  },
  AppointmentUpdateInput: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "number" },
      title: { type: "string" },
      description: { type: "string" },
      type: { type: "string" },
      startTime: { type: "string", format: "date-time" },
      status: { type: "string" },
    },
  },
  AppointmentListInput: {
    type: "object",
    properties: {
      limit: { type: "number", default: 50 },
      offset: { type: "number", default: 0 },
      from: { type: "string", format: "date-time" },
      to: { type: "string", format: "date-time" },
    },
  },
  AppointmentDto: {
    type: "object",
    properties: {
      id: { type: "number" },
      userId: { type: "number" },
      leadId: { type: "number" },
      title: { type: "string" },
      description: { type: "string", nullable: true },
      type: { type: "string" },
      startTime: { type: "string", format: "date-time" },
      endTime: { type: "string", format: "date-time", nullable: true },
      status: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  // ─── Sentiment ───────────────────────────────────────────────────────────
  AnalyzeSentimentInput: {
    type: "object",
    required: ["message"],
    properties: {
      message: { type: "string" },
      conversationId: { type: "string" },
    },
  },
  SentimentAnalysisResult: {
    type: "object",
    properties: {
      sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
      score: { type: "number" },
      label: { type: "string" },
    },
  },
  AnalyzeSentimentResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: { $ref: "#/components/schemas/SentimentAnalysisResult" },
      timestamp: { type: "string", format: "date-time" },
    },
  },
  AnalyzeBatchSentimentInput: {
    type: "object",
    required: ["messages"],
    properties: {
      messages: { type: "array", items: { type: "string" }, minItems: 1 },
    },
  },

  // ─── Escalation ────────────────────────────────────────────────────────────
  CheckEscalationInput: {
    type: "object",
    required: ["sentiment", "urgency"],
    properties: {
      sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
      urgency: { type: "string", enum: ["low", "medium", "high"] },
    },
  },
  CreateEscalationAlertInput: {
    type: "object",
    required: ["conversationId", "messageId", "sentiment", "urgency"],
    properties: {
      conversationId: { type: "string" },
      messageId: { type: "string" },
      sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
      urgency: { type: "string", enum: ["low", "medium", "high"] },
    },
  },
  UpdateAttendantStatusInput: {
    type: "object",
    required: ["attendantId", "status"],
    properties: {
      attendantId: { type: "string" },
      status: { type: "string", enum: ["available", "busy", "away"] },
    },
  },

  // ─── AI ──────────────────────────────────────────────────────────────────
  AiChatInput: {
    type: "object",
    required: ["message"],
    properties: {
      message: { type: "string" },
      context: {
        type: "object",
        properties: {
          leadName: { type: "string" },
          leadEmail: { type: "string" },
          leadPhone: { type: "string" },
          conversationHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["user", "assistant"] },
                content: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  AiChatResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: {
        type: "object",
        properties: {
          response: { type: "string" },
          confidence: { type: "number" },
          suggestions: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  AiSuggestResponseInput: {
    type: "object",
    required: ["leadId", "lastMessage"],
    properties: {
      leadId: { type: "number" },
      lastMessage: { type: "string" },
    },
  },

  // ─── AI Assistant (Copilot) ──────────────────────────────────────────────
  AiAssistantMessageDto: {
    type: "object",
    properties: {
      role: { type: "string", enum: ["user", "assistant", "system"] },
      content: { type: "string", maxLength: 2000 },
    },
  },
  AiAssistantChatInput: {
    type: "object",
    required: ["messages"],
    properties: {
      conversationId: { type: "number", minimum: 1 },
      messages: {
        type: "array",
        items: { $ref: "#/components/schemas/AiAssistantMessageDto" },
      },
    },
  },
  AiAssistantConversationDto: {
    type: "object",
    properties: {
      id: { type: "number" },
      userId: { type: "number" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  // ─── OpenClaw Automations ────────────────────────────────────────────────
  OpenClawAutomationInput: {
    type: "object",
    required: ["name", "triggerEvent", "minScore", "actionType", "actionConfig"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      triggerEvent: { type: "string" },
      minScore: { type: "string" },
      actionType: { type: "string" },
      actionConfig: { type: "string" },
      executionMode: { type: "string" },
      isActive: { type: "boolean", default: true },
    },
  },
  OpenClawAutomationUpdateInput: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "number" },
      data: {
        type: "object",
        description: "Campos parciais da automação",
      },
    },
  },

  // ─── Admin ───────────────────────────────────────────────────────────────
  AdminGetUsersInput: {
    type: "object",
    properties: {
      limit: { type: "number", default: 50 },
      offset: { type: "number", default: 0 },
      search: { type: "string" },
      plan: { type: "string", enum: ["free", "starter", "professional", "enterprise"] },
      status: { type: "string", enum: ["active", "inactive", "banned"] },
    },
  },
  AdminUserListItem: {
    type: "object",
    properties: {
      id: { type: "number" },
      name: { type: "string", nullable: true },
      email: { type: "string", nullable: true },
      plan: { type: "string" },
      isActive: { type: "boolean" },
      isBanned: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      lastLogin: { type: "string", format: "date-time", nullable: true },
      totalLeads: { type: "number" },
    },
  },
  AdminBanUserInput: {
    type: "object",
    required: ["userId"],
    properties: {
      userId: { type: "number" },
      reason: { type: "string" },
    },
  },
  AdminUpdateUserPlanInput: {
    type: "object",
    required: ["userId", "planId"],
    properties: {
      userId: { type: "number" },
      planId: { type: "string", enum: ["free", "starter", "professional", "enterprise"] },
    },
  },

  // ─── Support ─────────────────────────────────────────────────────────────
  SupportTicketDto: {
    type: "object",
    properties: {
      id: { type: "number" },
      userId: { type: "number" },
      subject: { type: "string" },
      status: { type: "string" },
      priority: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  SupportTicketReplyDto: {
    type: "object",
    properties: {
      id: { type: "number" },
      ticketId: { type: "number" },
      role: { type: "string", enum: ["user", "support"] },
      content: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
    },
  },
  SupportCreateReplyInput: {
    type: "object",
    required: ["ticketId", "content"],
    properties: {
      ticketId: { type: "number" },
      content: { type: "string" },
    },
  },
  SupportUpdateTicketStatusInput: {
    type: "object",
    required: ["ticketId", "status"],
    properties: {
      ticketId: { type: "number" },
      status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"] },
    },
  },

  // ─── Analytics (Admin) ───────────────────────────────────────────────────
  AnalyticsOverviewDto: {
    type: "object",
    properties: {
      totalUsers: { type: "number" },
      totalLeads: { type: "number" },
      totalRevenue: { type: "number" },
      activeSubscriptions: { type: "number" },
    },
  },
  AnalyticsUserGrowthDto: {
    type: "object",
    properties: {
      period: { type: "string" },
      newUsers: { type: "number" },
      totalUsers: { type: "number" },
    },
  },

  // ─── Stripe Webhook ───────────────────────────────────────────────────────
  StripeWebhookPayload: {
    type: "object",
    description: "Payload do evento Stripe (raw JSON). Assinatura validada via header Stripe-Signature.",
    additionalProperties: true,
  },

  // ─── tRPC batch format ────────────────────────────────────────────────────
  TrpcBatchRequest: {
    type: "object",
    description: "Formato de requisição batch tRPC. Chave numérica (0, 1, ...) com objeto { json: input }.",
    additionalProperties: {
      type: "object",
      properties: {
        json: { description: "Input do procedimento" },
      },
    },
  },
  TrpcBatchResponse: {
    type: "object",
    description: "Resposta batch tRPC. Chave numérica com result.data ou result.error.",
    additionalProperties: {
      type: "object",
      properties: {
        result: {
          type: "object",
          properties: {
            data: { description: "Dados retornados pelo procedimento" },
            error: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
} as const;

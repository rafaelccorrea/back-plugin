import { schemas as dtoSchemas } from "./swagger-dtos";
import { buildTrpcPaths } from "./swagger-trpc-paths";

/**
 * Especificação OpenAPI 3.0 para documentação Swagger de todas as rotas da API.
 * 100% do sistema documentado: rotas REST, cada procedimento tRPC como rota individual e todos os DTOs.
 */
const trpcPaths = buildTrpcPaths();

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "WhatsApp Lead Plugin - API",
    description:
      "Documentação completa da API: rotas REST (webhooks, auth, OAuth), cada procedimento tRPC como rota individual e todos os DTOs em Components > Schemas.",
    version: "1.0.0",
  },
  servers: [{ url: "/", description: "Servidor atual" }],
  tags: [
    { name: "Documentação", description: "Swagger UI e OpenAPI JSON" },
    { name: "Auth", description: "Autenticação e tokens" },
    { name: "Webhooks", description: "Webhooks externos e Stripe" },
    { name: "OAuth", description: "Login OAuth (Manus e Google)" },
    { name: "System", description: "System (health, notifyOwner)" },
    { name: "Leads", description: "Leads e análise de conversas" },
    { name: "Billing", description: "Assinatura e uso" },
    { name: "Checkout", description: "Checkout e planos Stripe" },
    { name: "Notifications", description: "Notificações" },
    { name: "Sentiment", description: "Análise de sentimento" },
    { name: "Escalation", description: "Escalação e atendentes" },
    { name: "Admin", description: "Administração (admin)" },
    { name: "Admin Billing", description: "Billing admin (transações, reembolsos)" },
    { name: "Support", description: "Tickets de suporte" },
    { name: "Analytics", description: "Analytics e métricas" },
    { name: "AI", description: "IA (chat, sugestões)" },
    { name: "Stripe Sync", description: "Sincronização Stripe" },
    { name: "Appointments", description: "Agendamentos" },
    { name: "Integrations", description: "Webhooks de integração" },
    { name: "Automations", description: "Automações" },
    { name: "OpenClaw", description: "Automações OpenClaw" },
    { name: "AI Assistant", description: "Copiloto de IA" },
    { name: "tRPC", description: "Endpoint tRPC genérico (batch)" },
  ],
  paths: {
    // ─── Documentação ────────────────────────────────────────────────────
    "/api/docs": {
      get: {
        tags: ["Documentação"],
        summary: "Swagger UI",
        description: "Interface interativa da documentação (Swagger UI).",
        responses: { "200": { description: "HTML da Swagger UI" } },
      },
    },
    "/api/docs.json": {
      get: {
        tags: ["Documentação"],
        summary: "OpenAPI JSON",
        description: "Especificação OpenAPI em JSON (para ferramentas externas).",
        responses: {
          "200": {
            description: "Especificação OpenAPI 3.0",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },

    // ─── Rotas REST ─────────────────────────────────────────────────────
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh do access token",
        description:
          "Troca um refresh token por um novo access token. Use quando o access token expirar. Não exige Authorization.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRefreshInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Novo access token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthRefreshResponse" },
              },
            },
          },
          "401": {
            description: "Refresh token inválido ou expirado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "400": {
            description: "refreshToken ausente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

    "/api/webhooks/stripe": {
      post: {
        tags: ["Webhooks"],
        summary: "Webhook Stripe",
        description:
          "Recebe eventos do Stripe (assinaturas, pagamentos). O body deve ser raw JSON; a assinatura é validada via header Stripe-Signature.",
        parameters: [
          {
            name: "Stripe-Signature",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StripeWebhookPayload" },
            },
          },
        },
        responses: {
          "200": {
            description: "Webhook processado",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "400": {
            description: "Falha ao processar webhook",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },

    "/api/webhooks.externalLead": {
      post: {
        tags: ["Webhooks"],
        summary: "Webhook externo – captura de lead",
        description:
          "Recebe leads de integrações (Zapier, Make, etc.). Exige API Key no header Authorization (Bearer), X-API-Key ou no body (apiKey).",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ExternalLeadInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Lead criado com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExternalLeadResponse" },
              },
            },
          },
          "401": {
            description: "API Key ausente ou inválida",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "500": {
            description: "Erro interno",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },

    "/api/__manus__/logs": {
      post: {
        tags: ["Webhooks"],
        summary: "Manus debug logs",
        description: "Coletor de logs de debug do Manus. Aceita qualquer body JSON.",
        requestBody: {
          content: {
            "application/json": { schema: { type: "object" } },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
        },
      },
    },

    "/api/oauth/callback": {
      get: {
        tags: ["OAuth"],
        summary: "Callback OAuth (Manus)",
        description: "Callback após login OAuth. Requer code e state na query.",
        parameters: [
          { name: "code", in: "query", required: true, schema: { type: "string" } },
          { name: "state", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "302": { description: "Redireciona para /" },
          "400": {
            description: "code ou state ausentes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
          "500": {
            description: "Falha no callback OAuth",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },

    "/api/oauth/google": {
      get: {
        tags: ["OAuth"],
        summary: "Iniciar login com Google",
        description: "Redireciona para o fluxo OAuth do Google.",
        parameters: [
          {
            name: "returnTo",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "URL para redirecionar após login",
          },
        ],
        responses: {
          "302": { description: "Redireciona para Google OAuth" },
          "500": {
            description: "Google OAuth não configurado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },

    "/api/oauth/google/callback": {
      get: {
        tags: ["OAuth"],
        summary: "Callback Google OAuth",
        description: "Callback após login com Google. code e state na query.",
        parameters: [
          { name: "code", in: "query", required: true, schema: { type: "string" } },
          { name: "state", in: "query", required: false, schema: { type: "string" } },
          { name: "error", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "302": { description: "Redireciona para returnTo ou /" },
          "400": {
            description: "Code ausente ou erro do provedor",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },

    "/api/trpc/{path}": {
      get: {
        tags: ["tRPC"],
        summary: "tRPC – query (GET)",
        description:
          "Chamada tRPC via GET. path = procedimento no formato router.procedure (ex: auth.me, leads.list). " +
          "Input via query batch ou input. Todos os DTOs de request/response de cada procedimento estão em **Components > Schemas** (ex: AuthRegisterInput, AuthLoginResponse, LeadDto, LeadListInput, BillingSubscriptionDto, CreateCheckoutSessionInput, etc.).",
        parameters: [
          {
            name: "path",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "auth.me",
          },
          {
            name: "input",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "JSON stringificado do input (para procedures com input)",
          },
        ],
        responses: {
          "200": {
            description: "Resultado do procedimento",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "401": { description: "Não autorizado" },
          "400": { description: "Bad request" },
        },
      },
      post: {
        tags: ["tRPC"],
        summary: "tRPC – mutation/query (POST)",
        description:
          "Chamada tRPC via POST (batch ou single). Body: { \"0\": { \"json\": { ...input } } } – o objeto em json segue o DTO do procedimento (veja Components > Schemas). " +
          "Path no URL: /api/trpc/router.procedure (ex: /api/trpc/auth.login). Autenticação: cookie de sessão ou Authorization: Bearer <accessToken>. " +
          "DTOs: auth.login → AuthLoginInput / AuthLoginResponse; leads.list → LeadListInput / LeadListResponse; checkout.createCheckoutSession → CreateCheckoutSessionInput / CreateCheckoutSessionResponse; etc.",
        parameters: [
          {
            name: "path",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "auth.login",
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "Input do procedimento (formato tRPC)",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Resultado do procedimento",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "401": { description: "Não autorizado" },
          "400": { description: "Bad request" },
        },
      },
    },

    // ─── Rotas tRPC (cada procedimento como rota individual) ─────────────
    ...trpcPaths,
  },

  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Bearer <sua-api-key> ou use o header X-API-Key",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token JWT (após login ou refresh)",
      },
    },
    /** 100% dos DTOs do sistema: Auth, Lead, Billing, Checkout, Notifications, Automations, Integrations, Appointments, Sentiment, Escalation, AI, Admin, Support, Analytics, tRPC. */
    schemas: { ...dtoSchemas },
  },

  // Lista de procedimentos tRPC para referência na documentação
  "x-trpc-procedures": [
    "auth.logout",
    "auth.register",
    "auth.login",
    "auth.verifyEmail",
    "auth.resendVerification",
    "auth.forgotPassword",
    "auth.resetPassword",
    "auth.changePassword",
    "auth.me",
    "auth.regenerateApiKey",
    "leads.create",
    "leads.list",
    "leads.getById",
    "leads.update",
    "leads.getMonthlyUsage",
    "leads.getStats",
    "billing.getSubscription",
    "billing.getUsage",
    "billing.checkQuotaLimits",
    "checkout.createCheckoutSession",
    "checkout.getBillingInfo",
    "checkout.createCustomerPortalSession",
    "checkout.cancelSubscription",
    "checkout.reactivateSubscription",
    "checkout.listPlans",
    "notifications.list",
    "notifications.markAsRead",
    "notifications.getAdminUnreadCount",
    "notifications.getById",
    "notifications.markAllAsRead",
    "notifications.testNotification",
    "sentiment.analyze",
    "sentiment.getStats",
    "escalation.createAlert",
    "escalation.resolveAlert",
    "escalation.getActiveAlerts",
    "escalation.getStats",
    "escalation.getAvailableAttendants",
    "escalation.getAllAttendants",
    "admin.getUser",
    "admin.updateUser",
    "admin.updateUserPlan",
    "admin.deleteUser",
    "admin.getStats",
    "adminBilling.getStats",
    "adminBilling.getTransactions",
    "adminBilling.getSubscriptions",
    "adminBilling.updateUserPlan",
    "adminBilling.syncStripeData",
    "support.getUserTickets",
    "support.getTickets",
    "support.getTicketById",
    "support.createReply",
    "support.updateTicketStatus",
    "support.closeTicket",
    "support.getStats",
    "support.syncData",
    "analytics.getOverview",
    "analytics.getUserGrowth",
    "analytics.getLeadsByStatus",
    "analytics.getUserActivity",
    "analytics.getTopUsers",
    "analytics.getSystemHealth",
    "analytics.getUserAnalytics",
    "ai.generateImage",
    "ai.getImageStatus",
    "stripeSync.syncSubscription",
    "stripeSync.checkPaymentStatus",
    "stripeSync.getPaymentHistory",
    "stripeSync.syncAllUsers",
    "appointments.create",
    "appointments.update",
    "appointments.getByLead",
    "appointments.list",
    "webhooks.externalLead",
    "integrations.getWebhookConfig",
    "integrations.updateWebhook",
    "integrations.disableWebhook",
    "integrations.canUseIntegrations",
    "automations.list",
    "automations.get",
    "automations.create",
    "automations.update",
    "automations.delete",
    "openClawAutomations.list",
    "openClawAutomations.create",
    "openClawAutomations.update",
    "openClawAutomations.delete",
    "aiAssistant.listConversations",
    "aiAssistant.createNewConversation",
    "aiAssistant.getConversation",
    "aiAssistant.sendMessage",
    "aiAssistant.regenerateResponse",
    "aiAssistant.deleteConversation",
    "system.* (health, etc.)",
  ],
} as const;

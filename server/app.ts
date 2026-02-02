import "dotenv/config";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerGoogleOAuthRoutes } from "./_core/googleOAuth";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { getUserByCaptureToken } from "./db";
import { validateQuota } from "./services/quotaManager";
import { handleStripeWebhook } from "./webhooks/stripe";
import { openApiSpec } from "./swagger";

const DEFAULT_CORS_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /\.manuspre\.computer$/,
  /\.manus\.computer$/,
  /\.manus-asia\.computer$/,
  /\.manuscomputer\.ai$/,
  /\.manusvm\.computer$/,
];

/** Origens permitidas para CORS (frontend). Em dev sempre permite localhost; CORS_ORIGIN adiciona/sobrescreve. */
function corsOrigin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return callback(null, true);

  const fromEnv = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedList: (string | RegExp)[] =
    fromEnv.length > 0 ? [...fromEnv, ...DEFAULT_CORS_PATTERNS] : DEFAULT_CORS_PATTERNS;

  const ok = allowedList.some((o) => (typeof o === "string" ? o === origin : o.test(origin)));
  callback(null, ok);
}

/**
 * Cria a aplicação Express com todas as rotas de API (tRPC, OAuth, webhooks).
 * Usado tanto no servidor Node (index.ts) quanto no handler serverless da Vercel (api/index.ts).
 * WebSocket e arquivos estáticos são adicionados apenas no servidor Node.
 */
export function createApp() {
  const app = express();

  // CORS – permitir frontend (ex.: localhost:5173) e origens configuradas
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    })
  );

  // Stripe webhook DEVE vir ANTES de express.json() para receber o body bruto (verificação de assinatura)
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const signature = req.headers["stripe-signature"] as string;
        const body = req.body instanceof Buffer ? req.body : Buffer.from(req.body);
        const bodyStr = body.toString("utf8");

        const result = await handleStripeWebhook({
          body: bodyStr,
          signature,
        });

        res.json(result);
      } catch (error) {
        console.error("[Webhook] Error processing Stripe webhook:", error);
        res.status(400).json({ error: "Webhook processing failed" });
      }
    }
  );

  // Body parsers (depois do webhook para não consumir o body bruto do Stripe)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Raiz da API (útil quando só o backend está no ar, ex.: deploy só-backend na Vercel)
  app.get("/api", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json({ message: "Hello World", docs: "/api/docs", trpc: "/api/trpc" });
  });

  // Swagger / OpenAPI – documentação de todas as rotas (REST + tRPC)
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec as Record<string, unknown>));
  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(openApiSpec);
  });

  // Manus debug collector (POST /__manus__/logs) – em dev o Vite trata; na Vercel o rewrite manda para /api/__manus__/logs
  app.post("/api/__manus__/logs", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ success: true });
  });

  // REST: Webhook externo – exige API Key no header (recomendado) ou no body. Rota não é aberta.
  app.post("/api/webhooks.externalLead", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
      let apiKey: string | undefined;
      if (authHeader?.startsWith("Bearer ")) {
        apiKey = authHeader.slice(7).trim();
      } else if (apiKeyHeader) {
        apiKey = String(apiKeyHeader).trim();
      }
      const bodyKey = req.body?.apiKey;
      const apiKeyToUse = apiKey ?? (typeof bodyKey === "string" ? bodyKey.trim() : undefined);
      if (!apiKeyToUse) {
        res.status(401).json({
          error: {
            message: "API Key obrigatória. Envie no header Authorization: Bearer <sua-api-key> ou X-API-Key: <sua-api-key>, ou no body como apiKey.",
            code: "UNAUTHORIZED",
          },
        });
        return;
      }
      const body = { ...req.body, apiKey: apiKeyToUse };
      const ctx = await createContext({ req, res });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.webhooks.externalLead(body);
      res.json(result);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Failed to capture lead";
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "INTERNAL_SERVER_ERROR";
      const status = code === "UNAUTHORIZED" ? 401 : 500;
      res.status(status).json({ error: { message, code } });
    }
  });

  // GET: config do formulário público (white-label + se cota está esgotada). Público.
  app.get("/api/capture/config/:token", async (req, res) => {
    try {
      const token = req.params.token?.trim();
      if (!token) {
        res.status(400).json({ error: { message: "Token ausente.", code: "BAD_REQUEST" } });
        return;
      }
      const user = await getUserByCaptureToken(token);
      if (!user) {
        res.status(404).json({ error: { message: "Formulário não encontrado.", code: "NOT_FOUND" } });
        return;
      }
      const quotaCheck = await validateQuota(user.id, "lead");
      let settings: Record<string, unknown> = {};
      if (user.captureFormSettings) {
        try {
          settings = JSON.parse(user.captureFormSettings) as Record<string, unknown>;
        } catch {
          // ignore invalid JSON
        }
      }
      res.json({
        companyName: settings.companyName ?? user.name ?? "Contato",
        logoUrl: settings.logoUrl ?? null,
        primaryColor: settings.primaryColor ?? "#2563eb",
        buttonText: settings.buttonText ?? "Enviar",
        thankYouMessage: settings.thankYouMessage ?? "Obrigado! Entraremos em contato em breve.",
        showPoweredBy: settings.showPoweredBy !== false,
        quotaExceeded: !quotaCheck.allowed,
      });
    } catch (err: unknown) {
      console.error("[Capture] GET config error:", err);
      res.status(500).json({ error: { message: "Erro ao carregar formulário.", code: "INTERNAL_SERVER_ERROR" } });
    }
  });

  // REST: Formulário público de captura – token no body (link por usuário, sem expor API Key).
  app.post("/api/capture", async (req, res) => {
    try {
      const { token, name, phone, email, source } = req.body ?? {};
      if (!token || typeof token !== "string" || !name || typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          error: { message: "token e name são obrigatórios.", code: "BAD_REQUEST" },
        });
        return;
      }
      const user = await getUserByCaptureToken(String(token).trim());
      if (!user?.apiKey) {
        res.status(401).json({
          error: { message: "Link de formulário inválido ou expirado.", code: "UNAUTHORIZED" },
        });
        return;
      }
      const body = {
        apiKey: user.apiKey,
        name: String(name).trim(),
        phone: typeof phone === "string" ? phone.trim() || undefined : undefined,
        email: typeof email === "string" ? email.trim() || undefined : undefined,
        source: typeof source === "string" && source.trim() ? source.trim() : "form_site",
      };
      const ctx = await createContext({ req, res });
      const caller = appRouter.createCaller(ctx);
      const result = await caller.webhooks.externalLead(body);
      res.json(result);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Falha ao enviar.";
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "INTERNAL_SERVER_ERROR";
      const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
      res.status(status).json({ error: { message, code } });
    }
  });

  // REST: Refresh token (sem Authorization; usado quando o access token expira)
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken || typeof refreshToken !== "string") {
        res.status(400).json({ error: { message: "refreshToken é obrigatório", code: "BAD_REQUEST" } });
        return;
      }
      const { refreshAccessToken } = await import("./services/authService");
      const accessToken = await refreshAccessToken(refreshToken);
      res.json({ accessToken });
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "UNAUTHORIZED";
      const message = err instanceof Error ? err.message : "Refresh token inválido";
      res.status(401).json({ error: { message, code } });
    }
  });

  // OAuth callbacks
  registerOAuthRoutes(app);
  registerGoogleOAuthRoutes(app);

  // tRPC API – ler Authorization do Express req e passar via res.locals (adapter usa Web API Request)
  app.use("/api/trpc", (req, res) => {
    (res as { locals?: { authHeader?: string } }).locals = (res as { locals?: { authHeader?: string } }).locals || {};
    (res as { locals: { authHeader?: string } }).locals.authHeader =
      req.headers.authorization ?? (req.headers as Record<string, string>)["authorization"];
    const createContextWithAuth = (opts: Parameters<typeof createContext>[0]) =>
      createContext({ ...opts, authHeaderFromReq: (res as { locals: { authHeader?: string } }).locals.authHeader } as Parameters<typeof createContext>[0]);
    const middleware = createExpressMiddleware({
      router: appRouter,
      createContext: createContextWithAuth,
    });
    middleware(req, res);
  });

  return app;
}

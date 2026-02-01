import "dotenv/config";
import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerGoogleOAuthRoutes } from "./_core/googleOAuth";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { handleStripeWebhook } from "./webhooks/stripe";

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

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}

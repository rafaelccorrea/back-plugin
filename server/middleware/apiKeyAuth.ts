import { Request, Response, NextFunction } from "express";
import { getUserByApiKey } from "../db";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    apiKey: string;
    email: string | null;
  };
  apiKey?: string;
}

/**
 * Middleware para validar API Key em requisições
 * Extrai a API Key do header Authorization: Bearer {apiKey}
 */
export async function apiKeyAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing or invalid Authorization header",
        code: "MISSING_API_KEY",
      });
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "

    if (!apiKey) {
      return res.status(401).json({
        error: "API Key is required",
        code: "INVALID_API_KEY",
      });
    }

    const user = await getUserByApiKey(apiKey);

    if (!user) {
      return res.status(401).json({
        error: "Invalid API Key",
        code: "INVALID_API_KEY",
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      apiKey: user.apiKey,
      email: user.email,
    };
    req.apiKey = apiKey;

    next();
  } catch (error) {
    console.error("[API Key Auth] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}

/**
 * Middleware para validar rate limiting
 * Implementa rate limiting simples baseado em contagem de requisições
 */
export async function rateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minuto
) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const apiKey = req.apiKey || req.headers.authorization;

    if (!apiKey) {
      return next();
    }

    const now = Date.now();
    const key = `${apiKey}:${req.path}`;
    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      // Reset counter
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}

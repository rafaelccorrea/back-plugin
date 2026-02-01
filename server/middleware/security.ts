import { Request, Response, NextFunction } from "express";
import { TRPCError } from "@trpc/server";

/**
 * Middleware de Segurança
 * Implementa rate limiting, validações e proteções
 */

// ============================================================================
// Rate Limiting em Memória (produção: usar Redis)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting por IP e usuário
 */
export function createRateLimiter(
  windowMs: number = 60000, // 1 minuto
  maxRequests: number = 100
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${(req as any).user?.id || "anonymous"}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", entry.resetTime);

    if (entry.count > maxRequests) {
      res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Validação de Input
// ============================================================================

/**
 * Sanitiza strings contra XSS
 */
export function sanitizeString(str: string): string {
  if (typeof str !== "string") return str;

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Valida e sanitiza objeto
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

// ============================================================================
// Validação de Permissões
// ============================================================================

/**
 * Verifica se usuário é admin
 */
export function requireAdmin(userId: number, userRole?: string) {
  if (userRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem acessar este recurso",
    });
  }
}

/**
 * Verifica se usuário é dono do recurso
 */
export function requireOwnership(userId: number, resourceOwnerId: number) {
  if (userId !== resourceOwnerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar este recurso",
    });
  }
}

// ============================================================================
// Validação de Quotas
// ============================================================================

/**
 * Verifica se usuário atingiu quota
 */
export function checkQuotaExceeded(used: number, limit: number): boolean {
  return limit > 0 && used >= limit;
}

/**
 * Calcula percentual de uso
 */
export function calculateUsagePercent(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
}

// ============================================================================
// Validação de API Key
// ============================================================================

/**
 * Valida formato de API Key
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return /^[a-zA-Z0-9_-]{32,256}$/.test(apiKey);
}

/**
 * Gera nova API Key
 */
export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let apiKey = "";

  for (let i = 0; i < 64; i++) {
    apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return apiKey;
}

// ============================================================================
// Headers de Segurança
// ============================================================================

/**
 * Adiciona headers de segurança
 */
export function addSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // HSTS
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // X-Content-Type-Options
  res.setHeader("X-Content-Type-Options", "nosniff");

  // X-Frame-Options
  res.setHeader("X-Frame-Options", "DENY");

  // X-XSS-Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  next();
}

// ============================================================================
// Validação de Webhook
// ============================================================================

/**
 * Valida assinatura de webhook (Stripe, etc)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" = "sha256"
): boolean {
  const crypto = require("crypto");
  const hash = crypto.createHmac(algorithm, secret).update(payload).digest("hex");
  return hash === signature;
}

// ============================================================================
// Logging de Auditoria
// ============================================================================

export interface AuditLog {
  userId: number;
  action: string;
  resource: string;
  resourceId?: string | number;
  status: "success" | "failure";
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

/**
 * Cria entrada de log de auditoria
 */
export function createAuditLog(
  userId: number,
  action: string,
  resource: string,
  status: "success" | "failure",
  options?: {
    resourceId?: string | number;
    details?: Record<string, any>;
    ipAddress?: string;
  }
): AuditLog {
  return {
    userId,
    action,
    resource,
    status,
    resourceId: options?.resourceId,
    details: options?.details,
    timestamp: new Date(),
    ipAddress: options?.ipAddress,
  };
}

// ============================================================================
// Validação de Dados Sensíveis
// ============================================================================

/**
 * Mascara dados sensíveis para logging
 */
export function maskSensitiveData(obj: Record<string, any>): Record<string, any> {
  const sensitiveFields = ["password", "apiKey", "token", "secret", "creditCard"];
  const masked = { ...obj };

  for (const field of sensitiveFields) {
    if (field in masked) {
      masked[field] = "***MASKED***";
    }
  }

  return masked;
}

/**
 * Valida força de senha
 */
export function validatePasswordStrength(password: string): {
  isStrong: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Senha deve ter pelo menos 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula");
  }

  if (!/\d/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push("Senha deve conter pelo menos um caractere especial (!@#$%^&*)");
  }

  return {
    isStrong: errors.length === 0,
    errors,
  };
}

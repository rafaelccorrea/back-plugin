import { eq, and, gte, lt, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  users,
  leads,
  InsertLead,
  usageTracking,
  InsertUsageTracking,
  subscriptions,
  InsertSubscription,
  organizations,
  InsertOrganization,
  plans,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { randomBytes } from "crypto";

function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      apiKey: user.apiKey || generateApiKey(),
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet as Record<string, unknown>,
    });
    const user = await getUserByOpenId(user.openId);
    if (user) await ensureUserHasFreeSubscription(user.id);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByApiKey(apiKey: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.apiKey, apiKey))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function regenerateApiKey(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const newApiKey = generateApiKey();
  await db.update(users).set({ apiKey: newApiKey }).where(eq(users.id, userId));

  return newApiKey;
}

// ============================================================================
// LEAD MANAGEMENT
// ============================================================================

export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(leads).values(lead);
  return result;
}

export async function getLeadsByUserId(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(leads)
    .where(eq(leads.userId, userId))
    .orderBy((t) => t.createdAt)
    .limit(limit)
    .offset(offset);
}

export async function getLeadById(leadId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateLead(
  leadId: number,
  updates: Partial<InsertLead>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.update(leads).set(updates).where(eq(leads.id, leadId));
}

// ============================================================================
// USAGE TRACKING & QUOTAS
// ============================================================================

export async function getOrCreateUsageTracking(
  userId: number,
  month: string
): Promise<typeof usageTracking.$inferSelect> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db
    .select()
    .from(usageTracking)
    .where(
      and(eq(usageTracking.userId, userId), eq(usageTracking.month, month))
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new tracking record
  const newTracking: InsertUsageTracking = {
    userId,
    month,
    leadsCreated: 0,
    apiCallsMade: 0,
  };

  await db.insert(usageTracking).values(newTracking);

  const created = await db
    .select()
    .from(usageTracking)
    .where(
      and(eq(usageTracking.userId, userId), eq(usageTracking.month, month))
    )
    .limit(1);

  return created[0];
}

export async function incrementUsageTracking(
  userId: number,
  month: string,
  type: "leadsCreated" | "apiCallsMade",
  amount = 1
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const tracking = await getOrCreateUsageTracking(userId, month);

  const updates =
    type === "leadsCreated"
      ? { leadsCreated: (tracking.leadsCreated || 0) + amount }
      : { apiCallsMade: (tracking.apiCallsMade || 0) + amount };

  return await db
    .update(usageTracking)
    .set(updates)
    .where(
      and(eq(usageTracking.userId, userId), eq(usageTracking.month, month))
    );
}

export async function getCurrentMonthUsage(userId: number) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(usageTracking)
    .where(
      and(eq(usageTracking.userId, userId), eq(usageTracking.month, month))
    )
    .limit(1);

  if (result.length === 0) {
    return {
      leadsCreated: 0,
      apiCallsMade: 0,
    };
  }

  return {
    leadsCreated: result[0].leadsCreated || 0,
    apiCallsMade: result[0].apiCallsMade || 0,
  };
}

// ============================================================================
// SUBSCRIPTION & BILLING
// ============================================================================

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select({
      subscription: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/** Busca assinatura ativa do usuário (tenta camelCase e snake_case). Retorna { planId, status } ou null. */
async function getActiveSubscriptionRow(userId: number): Promise<{ planId: number; status: string | null } | null> {
  if (!_pool) return null;
  const subsQueries: Array<{ sql: string; label: string }> = [
    {
      sql: `SELECT "planId" AS plan_id, status FROM subscriptions WHERE "userId" = $1 AND status = 'active' ORDER BY "currentPeriodEnd" DESC LIMIT 1`,
      label: "camelCase",
    },
    {
      sql: `SELECT plan_id AS "planId", status FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY current_period_end DESC LIMIT 1`,
      label: "snake_case",
    },
  ];
  for (const { sql, label } of subsQueries) {
    try {
      const res = await _pool.query<{ plan_id?: number; planId?: number; status?: string | null }>(sql, [userId]);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      if (row) {
        const planId = row.plan_id ?? row.planId ?? row.plan_id;
        const status = row.status as string | null | undefined;
        if (planId != null) return { planId: Number(planId), status: status ?? null };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Mapeia stripe_price_id ou name do plano para tipo (free/starter/professional/enterprise). */
function inferPlanTypeFromRow(row: Record<string, unknown>): string | null {
  const stripePriceId = (row.stripe_price_id ?? row.stripePriceId ?? "") as string;
  const name = (row.name ?? "") as string;
  const n = name.toLowerCase();
  if (stripePriceId === "free" || n.includes("gratis") || n.includes("free")) return "free";
  if (n.includes("starter") || stripePriceId.includes("starter")) return "starter";
  if (n.includes("professional") || n.includes("profissional") || stripePriceId.includes("professional")) return "professional";
  if (n.includes("enterprise") || n.includes("empresarial") || stripePriceId.includes("enterprise")) return "enterprise";
  return null;
}

/** Busca tipo do plano na tabela plans pelo id. Usa SELECT * e lê plan_type/planType ou infere por stripe_price_id/name. */
async function getPlanTypeByPlanId(planId: number): Promise<string | null> {
  if (!_pool) return null;
  try {
    const res = await _pool.query(`SELECT * FROM plans WHERE id = $1 LIMIT 1`, [planId]);
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const fromColumn = row.plan_type ?? row.planType ?? row.type ?? null;
    if (fromColumn != null) return String(fromColumn);
    return inferPlanTypeFromRow(row);
  } catch (err) {
    console.log("[getPlanTypeByPlanId] planId:", planId, "ERRO:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Retorna o plano do usuário a partir da assinatura ativa (tabela subscriptions).
 */
export async function getActiveUserPlan(userId: number): Promise<string | null> {
  await getDb();
  if (!_pool) return null;
  const sub = await getActiveSubscriptionRow(userId);
  if (!sub) return null;
  return getPlanTypeByPlanId(sub.planId);
}

/**
 * Retorna plano e status da assinatura ativa (tabela subscriptions).
 */
export async function getActiveUserSubscriptionInfo(userId: number): Promise<{ plan: string; status: string | null } | null> {
  await getDb();
  if (!_pool) return null;
  const sub = await getActiveSubscriptionRow(userId);
  if (!sub) return null;
  const plan = await getPlanTypeByPlanId(sub.planId);
  if (!plan) return null;
  return { plan, status: sub.status };
}

/** Obtém ou cria o plano FREE na tabela plans (para registro de assinatura free). */
export async function getOrCreateFreePlanId(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select({ id: plans.id }).from(plans).where(eq(plans.stripePriceId, "free")).limit(1);
  if (existing.length > 0) return existing[0].id;
  const inserted = await db.insert(plans).values({
    planType: "free",
    name: "Gratis",
    description: "Plano gratuito",
    stripePriceId: "free",
    monthlyLeadsQuota: 10,
    monthlyApiCalls: 100,
    priceInCents: 0,
    currency: "USD",
  }).returning({ id: plans.id });
  if (!inserted[0]) throw new Error("Falha ao criar plano free");
  return inserted[0].id;
}

/** Garante que o usuário tem um registro em subscriptions (plano FREE se não tiver nenhum). */
export async function ensureUserHasFreeSubscription(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing.length > 0) return;
  const planId = await getOrCreateFreePlanId();
  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 10);
  const freeSub: InsertSubscription = {
    userId,
    planId,
    stripeSubscriptionId: `free_${userId}`,
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: end,
  };
  await db.insert(subscriptions).values(freeSub);
}

// ============================================================================
// ORGANIZATION MANAGEMENT
// ============================================================================

export async function createOrganization(org: InsertOrganization) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.insert(organizations).values(org);
}

export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add more feature queries here as your schema grows.

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/** Map snake_case row (from raw query) to User-like object with camelCase + plan */
function mapUserRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    openId: row.open_id,
    name: row.name,
    email: row.email,
    loginMethod: row.login_method,
    role: row.role,
    passwordHash: row.password_hash,
    emailVerified: row.email_verified,
    emailVerificationToken: row.email_verification_token,
    emailVerificationExpires: row.email_verification_expires,
    passwordResetToken: row.password_reset_token,
    passwordResetExpires: row.password_reset_expires,
    googleId: row.google_id,
    apiKey: row.api_key,
    organizationId: row.organization_id,
    organizationRole: row.organization_role,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSignedIn: row.last_signed_in,
  };
}

/**
 * Get user by email
 * Tries full schema first; on failure (e.g. missing "plan" column), falls back to raw query without plan.
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch {
    // Fallback: table may lack "plan" or enum (migration 0005 not applied). Query without plan and default it.
    if (!_pool) return undefined;
    try {
      const res = await _pool.query(
        `SELECT id, open_id, name, email, login_method, role, password_hash, email_verified,
         email_verification_token, email_verification_expires, password_reset_token, password_reset_expires,
         google_id, api_key, organization_id, organization_role, stripe_customer_id, stripe_subscription_id,
         created_at, updated_at, last_signed_in
         FROM users WHERE email = $1 LIMIT 1`,
        [email]
      );
      const row = res.rows[0];
      if (!row) return undefined;
      return mapUserRow(row) as Awaited<ReturnType<typeof getUserByEmail>>;
    } catch {
      return undefined;
    }
  }
}

/**
 * Get user by Google ID
 */
export async function getUserByGoogleId(googleId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new user
 */
export async function createUser(user: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const newUser: InsertUser = {
    email: user.email!,
    name: user.name ?? null,
    loginMethod: user.loginMethod ?? 'email',
    passwordHash: user.passwordHash ?? null,
    googleId: user.googleId ?? null,
    openId: user.openId ?? `email_${randomBytes(12).toString("hex")}`,
    apiKey: user.apiKey ?? generateApiKey(),
    role: user.role ?? 'user',
    emailVerified: user.emailVerified ?? false,
    emailVerificationToken: user.emailVerificationToken ?? null,
    emailVerificationExpires: user.emailVerificationExpires ?? null,
    lastSignedIn: new Date(),
  };

  const result = await db.insert(users).values(newUser).returning({ id: users.id });
  const inserted = result[0];
  if (!inserted) throw new Error("Falha ao criar usuário");
  await ensureUserHasFreeSubscription(inserted.id);
  return await getUserById(inserted.id);
}

/**
 * Update user information
 */
export async function updateUser(
  userId: number,
  updates: Partial<InsertUser>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
  return await getUserById(userId);
}

/**
 * Set email verification token
 */
export async function setEmailVerificationToken(
  userId: number,
  token: string,
  expires: Date
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set({
    emailVerificationToken: token,
    emailVerificationExpires: expires,
  }).where(eq(users.id, userId));
}

/**
 * Verify email with token
 */
export async function verifyEmailWithToken(token: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const user = result[0];

  // Check if token is expired
  if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
    return null;
  }

  // Mark email as verified and clear token
  await db.update(users).set({
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
  }).where(eq(users.id, user.id));

  return await getUserById(user.id);
}

/**
 * Set password reset token
 */
export async function setPasswordResetToken(
  userId: number,
  token: string,
  expires: Date
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set({
    passwordResetToken: token,
    passwordResetExpires: expires,
  }).where(eq(users.id, userId));
}

/**
 * Get user by password reset token
 */
export async function getUserByPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.passwordResetToken, token))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const user = result[0];

  // Check if token is expired
  if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
    return null;
  }

  return user;
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(
  token: string,
  newPasswordHash: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const user = await getUserByPasswordResetToken(token);
  if (!user) {
    return null;
  }

  // Update password and clear reset token
  await db.update(users).set({
    passwordHash: newPasswordHash,
    passwordResetToken: null,
    passwordResetExpires: null,
  }).where(eq(users.id, user.id));

  return await getUserById(user.id);
}

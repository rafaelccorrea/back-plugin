-- Automações (regras automáticas do usuário) – alinhado à tela CreateAutomation
CREATE TABLE IF NOT EXISTS "automations" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "trigger" varchar(64) NOT NULL,
  "action" varchar(64) NOT NULL,
  "message" text,
  "conditions" text NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "automation_user_idx" ON "automations" ("userId");
CREATE INDEX IF NOT EXISTS "automation_is_active_idx" ON "automations" ("isActive");

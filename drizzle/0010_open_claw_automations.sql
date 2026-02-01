-- Tabela OpenClaw Automations (planos Professional e Enterprise)
CREATE TABLE IF NOT EXISTS "openClawAutomations" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "triggerEvent" varchar(100) NOT NULL,
  "minScore" numeric(3, 2) DEFAULT '0.00',
  "actionType" varchar(100) NOT NULL,
  "actionConfig" text,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "openclaw_automation_user_idx" ON "openClawAutomations" ("userId");

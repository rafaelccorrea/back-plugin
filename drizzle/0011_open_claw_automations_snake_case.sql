-- Migrar openClawAutomations para snake_case (compatível com PostgreSQL)
DROP TABLE IF EXISTS "openClawAutomations";

CREATE TABLE IF NOT EXISTS "open_claw_automations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "trigger_event" varchar(100) NOT NULL,
  "min_score" numeric(3, 2) DEFAULT '0.00',
  "action_type" varchar(100) NOT NULL,
  "action_config" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "openclaw_automation_user_idx" ON "open_claw_automations" ("user_id");

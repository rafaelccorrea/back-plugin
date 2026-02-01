-- Recriar automations com colunas em snake_case (alinhado a webhooks)
DROP TABLE IF EXISTS "automations";

CREATE TABLE "automations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "trigger" varchar(64) NOT NULL,
  "action" varchar(64) NOT NULL,
  "message" text,
  "conditions" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "automation_user_idx" ON "automations" ("user_id");
CREATE INDEX IF NOT EXISTS "automation_is_active_idx" ON "automations" ("is_active");

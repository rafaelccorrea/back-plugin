-- Histórico de conversas do Copiloto IA
CREATE TABLE IF NOT EXISTS "ai_copilot_conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_copilot_conv_user_idx" ON "ai_copilot_conversations" ("user_id");

CREATE TABLE IF NOT EXISTS "ai_copilot_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL,
  "role" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_copilot_msg_conv_idx" ON "ai_copilot_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "ai_copilot_msg_created_idx" ON "ai_copilot_messages" ("created_at");

ALTER TABLE "ai_copilot_messages" ADD CONSTRAINT "ai_copilot_messages_conversation_id_ai_copilot_conversations_id_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "ai_copilot_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

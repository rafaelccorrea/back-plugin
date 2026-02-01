-- Permitir múltiplas conversas por usuário (remover UNIQUE em user_id)
DROP INDEX IF EXISTS "ai_copilot_conv_user_idx";
CREATE INDEX IF NOT EXISTS "ai_copilot_conv_user_updated_idx" ON "ai_copilot_conversations" ("user_id", "updated_at" DESC);

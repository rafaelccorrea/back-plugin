-- Título gerado pela IA para cada conversa do Copiloto
ALTER TABLE "ai_copilot_conversations" ADD COLUMN IF NOT EXISTS "title" varchar(120);

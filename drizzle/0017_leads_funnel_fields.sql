-- Funil de vendas (Enterprise): próxima ação e previsão de fechamento por lead
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "nextAction" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "expectedCloseAt" timestamp;

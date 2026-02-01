-- Adiciona coluna qualification_checklist na tabela leads (se não existir)
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "qualification_checklist" text;

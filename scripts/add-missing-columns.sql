-- Script para adicionar colunas faltantes na tabela users

-- Adicionar coluna passwordHash
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255);

-- Adicionar coluna emailVerified
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT FALSE;

-- Adicionar coluna emailVerificationToken
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerificationToken" VARCHAR(255);

-- Adicionar coluna emailVerificationExpires
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerificationExpires" TIMESTAMP;

-- Adicionar coluna passwordResetToken
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetToken" VARCHAR(255);

-- Adicionar coluna passwordResetExpires
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP;

-- Adicionar coluna googleId
ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255);

-- Adicionar coluna stripeCustomerId
ALTER TABLE users ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(255);

-- Adicionar coluna stripeSubscriptionId
ALTER TABLE users ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" VARCHAR(255);

-- Adicionar coluna currentPlanId
ALTER TABLE users ADD COLUMN IF NOT EXISTS "currentPlanId" INTEGER;

-- Adicionar coluna subscriptionStatus
ALTER TABLE users ADD COLUMN IF NOT EXISTS "subscriptionStatus" VARCHAR(50);

-- Adicionar coluna createdAt
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();

-- Adicionar coluna updatedAt
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Adicionar coluna lastSignedIn
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastSignedIn" TIMESTAMP;

-- Remover NOT NULL de openId e apiKey para permitir login com email/senha
ALTER TABLE users ALTER COLUMN "openId" DROP NOT NULL;
ALTER TABLE users ALTER COLUMN "apiKey" DROP NOT NULL;

-- Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;

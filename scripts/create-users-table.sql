-- Script para criar a tabela users no Supabase
-- Execute este script no SQL Editor do Supabase

-- Criar tabela users se não existir
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    "openId" VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    "loginMethod" VARCHAR(50) DEFAULT 'email',
    role VARCHAR(50) DEFAULT 'user',
    "passwordHash" VARCHAR(255),
    "emailVerified" BOOLEAN DEFAULT FALSE,
    "emailVerificationToken" VARCHAR(255),
    "emailVerificationExpires" TIMESTAMP,
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMP,
    "googleId" VARCHAR(255),
    "apiKey" VARCHAR(255),
    "organizationId" INTEGER,
    "organizationRole" VARCHAR(50),
    "stripeCustomerId" VARCHAR(255),
    "stripeSubscriptionId" VARCHAR(255),
    "currentPlanId" INTEGER,
    "subscriptionStatus" VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "lastSignedIn" TIMESTAMP
);

-- Criar índice para email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Criar índice para googleId
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users("googleId");

-- Criar tabela leads se não existir
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES users(id),
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    notes TEXT,
    tags TEXT[],
    "lastContact" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Criar índice para userId em leads
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads("userId");

-- Criar tabela conversations se não existir
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    "leadId" INTEGER REFERENCES leads(id),
    "userId" INTEGER REFERENCES users(id),
    platform VARCHAR(50) DEFAULT 'whatsapp',
    status VARCHAR(50) DEFAULT 'active',
    "lastMessageAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Criar tabela messages se não existir
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    "conversationId" INTEGER REFERENCES conversations(id),
    content TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL,
    "messageType" VARCHAR(50) DEFAULT 'text',
    status VARCHAR(50) DEFAULT 'sent',
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Criar tabela plans se não existir
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    interval VARCHAR(20) DEFAULT 'month',
    features JSONB,
    "stripePriceId" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO plans (name, description, price, interval, features, "isActive") VALUES
('Free', 'Plano gratuito para começar', 0, 'month', '{"leads": 50, "messages": 100, "integrations": 1}', true),
('Starter', 'Para pequenos negócios', 29, 'month', '{"leads": 500, "messages": 2000, "integrations": 3}', true),
('Professional', 'Para empresas em crescimento', 79, 'month', '{"leads": 2000, "messages": 10000, "integrations": 10}', true),
('Enterprise', 'Para grandes empresas', 199, 'month', '{"leads": -1, "messages": -1, "integrations": -1}', true)
ON CONFLICT DO NOTHING;

-- Verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

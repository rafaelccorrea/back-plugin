-- Script SQL para criar o usuário Master do ChatLead Pro
-- Execute este script no seu banco de dados PostgreSQL

-- Primeiro, vamos verificar se o usuário já existe e deletar se necessário
-- (Descomente a linha abaixo se quiser recriar o usuário)
-- DELETE FROM users WHERE email = 'rafael@chatleadpro.com.br';

-- A senha '11031998Ra@' foi hasheada com bcrypt (10 rounds)
-- Hash gerado: $2b$10$... (você precisa gerar o hash real)

-- Para gerar o hash da senha, use:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('11031998Ra@', 10).then(console.log)"

-- Inserir o usuário Master
INSERT INTO users (
    email,
    name,
    role,
    "passwordHash",
    "loginMethod",
    "apiKey",
    "emailVerified",
    "createdAt",
    "updatedAt",
    "lastSignedIn"
) VALUES (
    'rafael@chatleadpro.com.br',
    'Rafael Gustavo Correa',
    'admin',
    -- Hash bcrypt da senha '11031998Ra@' - substitua pelo hash real gerado
    '$2b$10$HASH_AQUI',
    'email',
    -- API Key gerada aleatoriamente
    encode(gen_random_bytes(32), 'hex'),
    true,
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    name = 'Rafael Gustavo Correa',
    "emailVerified" = true,
    "updatedAt" = NOW();

-- Verificar se o usuário foi criado
SELECT id, email, name, role, "emailVerified", "createdAt" 
FROM users 
WHERE email = 'rafael@chatleadpro.com.br';

-- ============================================
-- Script SQL para inserir usuário admin
-- ============================================
-- Email: rafael@chatleadpro.com.br
-- Senha: 11031998Ra@
-- Hash Bcrypt: $2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle

-- Verificar se usuário já existe
SELECT 'Verificando se usuário já existe...' as status;
SELECT COUNT(*) as user_count FROM users WHERE email = 'rafael@chatleadpro.com.br';

-- Inserir ou atualizar usuário admin
INSERT INTO users (
    email,
    name,
    role,
    passwordHash,
    loginMethod,
    apiKey,
    emailVerified,
    createdAt,
    updatedAt,
    lastSignedIn
) VALUES (
    'rafael@chatleadpro.com.br',
    'Rafael Gustavo Correa',
    'admin',
    '$2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle',
    'email',
    CONCAT('admin_key_', SUBSTRING(MD5(RAND()), 1, 20)),
    true,
    NOW(),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    role = 'admin',
    name = 'Rafael Gustavo Correa',
    emailVerified = true,
    updatedAt = NOW();

-- Verificar resultado
SELECT 'Usuário admin criado/atualizado com sucesso!' as status;
SELECT 
    id,
    email,
    name,
    role,
    emailVerified,
    apiKey,
    createdAt
FROM users 
WHERE email = 'rafael@chatleadpro.com.br';

-- ============================================
-- Credenciais de Login
-- ============================================
-- Email: rafael@chatleadpro.com.br
-- Senha: 11031998Ra@
-- Role: admin
-- ============================================

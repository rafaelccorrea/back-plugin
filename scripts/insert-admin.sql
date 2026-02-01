-- Script SQL para inserir usuário admin
-- Email: rafael@chatleadpro.com.br
-- Senha: 11031998Ra@ (hash bcrypt: $2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle)

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
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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

-- Verificar se foi criado
SELECT id, email, name, role, emailVerified, createdAt FROM users WHERE email = 'rafael@chatleadpro.com.br';

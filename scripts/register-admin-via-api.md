# Registrar Usuário Admin via API

## Opção 1: Usar o formulário de registro no navegador

1. Acesse: `https://nonmetallic-belinda-thankless.ngrok-free.dev/register`
2. Preencha com:
   - **Email:** rafael@chatleadpro.com.br
   - **Senha:** 11031998Ra@
   - **Nome:** Rafael Gustavo Correa
3. Clique em "Criar Conta"
4. Verifique o email (pode estar em spam)
5. Após verificar, faça login

## Opção 2: Usar cURL para registrar via API

```bash
curl -X POST https://nonmetallic-belinda-thankless.ngrok-free.dev/trpc/auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rafael@chatleadpro.com.br",
    "password": "11031998Ra@",
    "name": "Rafael Gustavo Correa"
  }'
```

## Opção 3: Modificar banco de dados diretamente

Se você tem acesso ao banco de dados MySQL:

```sql
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
```

## Credenciais do Admin

- **Email:** rafael@chatleadpro.com.br
- **Senha:** 11031998Ra@
- **Role:** admin
- **Hash Bcrypt:** $2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle

## Após criar o usuário

1. Faça login com as credenciais acima
2. Você será redirecionado para `/leads`
3. Acesse `/admin` para ver o painel administrativo
4. Todos os recursos de admin estarão disponíveis

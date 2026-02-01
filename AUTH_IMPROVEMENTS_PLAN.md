# Plano de Melhorias de Autenticação - WA-SDR

## Análise do Sistema Atual

### Autenticação Existente
- **Método único**: Manus OAuth
- **Fluxo**: Redirecionamento para portal OAuth → Callback → Criação/atualização de usuário → Cookie de sessão
- **Limitações**: 
  - Dependência total de um único provedor
  - Sem opção de email/senha tradicional
  - Sem recuperação de senha
  - Sem autenticação multi-provedor

### Schema Atual do Banco
```typescript
users {
  id: int (PK)
  openId: varchar(64) UNIQUE NOT NULL  // ID do OAuth
  name: text
  email: varchar(320) UNIQUE
  loginMethod: varchar(64)  // "manus", "google", etc
  role: enum("user", "admin")
  apiKey: varchar(128) UNIQUE NOT NULL
  // ... campos de billing e organização
}
```

## Melhorias Propostas

### 1. Login com Google OAuth

**Implementação**:
- Adicionar Google OAuth Strategy usando Passport.js ou implementação manual
- Criar rota `/api/oauth/google` e `/api/oauth/google/callback`
- Atualizar campo `loginMethod` para suportar "google"
- Manter compatibilidade com Manus OAuth existente

**Fluxo**:
```
Usuário clica "Login com Google"
  → Redireciona para Google OAuth
  → Google retorna code
  → Backend troca code por access_token
  → Busca informações do usuário (email, nome, googleId)
  → Cria/atualiza usuário no banco
  → Cria sessão e retorna cookie
  → Redireciona para dashboard
```

### 2. Autenticação com Email/Senha

**Mudanças no Schema**:
```typescript
users {
  // Campos existentes...
  
  // Novos campos para autenticação local
  passwordHash: varchar(255) NULLABLE  // bcrypt hash
  emailVerified: boolean DEFAULT false
  emailVerificationToken: varchar(255) NULLABLE
  emailVerificationExpires: timestamp NULLABLE
}
```

**Endpoints**:
- `POST /api/auth/register` - Criar conta com email/senha
- `POST /api/auth/login` - Login com email/senha
- `POST /api/auth/verify-email` - Verificar email
- `POST /api/auth/resend-verification` - Reenviar email de verificação

**Validações de Senha**:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

### 3. Recuperação de Senha

**Mudanças no Schema**:
```typescript
users {
  // Campos existentes...
  
  // Campos para reset de senha
  passwordResetToken: varchar(255) NULLABLE
  passwordResetExpires: timestamp NULLABLE
}
```

**Endpoints**:
- `POST /api/auth/forgot-password` - Solicitar reset de senha
- `POST /api/auth/reset-password` - Resetar senha com token
- `POST /api/auth/validate-reset-token` - Validar token antes de mostrar form

**Fluxo**:
```
Usuário esqueceu senha
  → Informa email
  → Sistema gera token único (UUID)
  → Envia email com link (válido por 1 hora)
  → Usuário clica no link
  → Valida token
  → Usuário define nova senha
  → Token é invalidado
  → Login automático ou redirecionamento
```

### 4. Serviço de Email

**Opções**:
1. **Resend** (Recomendado) - API simples, bom free tier
2. **SendGrid** - Robusto, usado em produção
3. **Nodemailer + SMTP** - Flexível, requer configuração

**Implementação com Resend**:
```typescript
// server/services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
  
  await resend.emails.send({
    from: 'WA-SDR <noreply@wa-sdr.com>',
    to: email,
    subject: 'Verifique seu email - WA-SDR',
    html: `
      <h1>Bem-vindo ao WA-SDR!</h1>
      <p>Clique no link abaixo para verificar seu email:</p>
      <a href="${verificationUrl}">Verificar Email</a>
    `
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  
  await resend.emails.send({
    from: 'WA-SDR <noreply@wa-sdr.com>',
    to: email,
    subject: 'Recuperação de senha - WA-SDR',
    html: `
      <h1>Recuperação de Senha</h1>
      <p>Você solicitou a recuperação de senha. Clique no link abaixo:</p>
      <a href="${resetUrl}">Resetar Senha</a>
      <p>Este link expira em 1 hora.</p>
    `
  });
}
```

### 5. Frontend - Novas Páginas

**Páginas a criar**:
1. `/login` - Página de login unificada
2. `/register` - Página de registro
3. `/forgot-password` - Solicitar reset
4. `/reset-password` - Form de nova senha
5. `/verify-email` - Confirmação de email

**Componentes**:
- `LoginForm.tsx` - Form com email/senha + botões OAuth
- `RegisterForm.tsx` - Form de registro com validação
- `ForgotPasswordForm.tsx` - Form de solicitação
- `ResetPasswordForm.tsx` - Form de nova senha
- `OAuthButtons.tsx` - Botões de Google e Manus

### 6. Segurança

**Medidas**:
- Bcrypt para hash de senhas (cost factor 12)
- Tokens criptograficamente seguros (crypto.randomBytes)
- Rate limiting em endpoints de autenticação
- HTTPS obrigatório em produção
- Sanitização de inputs
- Proteção contra timing attacks
- Logs de tentativas de login

## Estrutura de Arquivos

```
server/
├── _core/
│   ├── oauth.ts (atualizar)
│   └── googleOAuth.ts (novo)
├── routers/
│   └── auth.ts (novo - rotas de autenticação)
├── services/
│   ├── emailService.ts (novo)
│   ├── passwordService.ts (novo)
│   └── tokenService.ts (novo)
└── middleware/
    └── rateLimiter.ts (novo)

client/src/
├── pages/
│   ├── Login.tsx (novo)
│   ├── Register.tsx (novo)
│   ├── ForgotPassword.tsx (novo)
│   ├── ResetPassword.tsx (novo)
│   └── VerifyEmail.tsx (novo)
└── components/
    ├── LoginForm.tsx (novo)
    ├── RegisterForm.tsx (novo)
    └── OAuthButtons.tsx (novo)

drizzle/
└── schema.ts (atualizar)
```

## Variáveis de Ambiente Necessárias

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback

# Email Service (Resend)
RESEND_API_KEY=re_your_api_key

# App URLs
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5000

# Existing
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

## Ordem de Implementação

1. ✅ **Fase 1**: Analisar projeto atual
2. ✅ **Fase 2**: Criar plano detalhado
3. **Fase 3**: Atualizar schema do banco de dados
4. **Fase 4**: Implementar serviços (email, password, token)
5. **Fase 5**: Implementar rotas de autenticação (register, login, forgot, reset)
6. **Fase 6**: Implementar Google OAuth
7. **Fase 7**: Criar páginas e componentes do frontend
8. **Fase 8**: Atualizar roteamento e navegação
9. **Fase 9**: Testar fluxos completos
10. **Fase 10**: Commit e push

## Compatibilidade

- ✅ Manter Manus OAuth funcionando
- ✅ Manter API Key authentication para extensão Chrome
- ✅ Não quebrar fluxos existentes
- ✅ Migração suave (campos nullable)

## Próximos Passos

1. Atualizar schema do banco de dados
2. Instalar dependências necessárias (bcrypt, resend, etc)
3. Implementar serviços base
4. Criar rotas de autenticação
5. Desenvolver frontend

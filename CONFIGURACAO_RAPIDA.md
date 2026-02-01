# ⚡ Configuração Rápida - Variáveis de Ambiente

## 🎯 O que já está configurado

✅ **Banco de Dados PostgreSQL (Supabase)** - Pronto para uso!

```env
DATABASE_URL="postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

## 🔧 O que você precisa configurar

### 1. Google OAuth (Obrigatório para login com Google)

**Passo a passo:**

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. No menu lateral: **APIs & Services** → **Credentials**
4. Clique em **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Se solicitado, configure a tela de consentimento OAuth:
   - User Type: **External**
   - App name: **WA-SDR**
   - User support email: seu email
   - Developer contact: seu email
   - Salve e continue
6. Volte para criar OAuth Client ID:
   - Application type: **Web application**
   - Name: **WA-SDR**
   - Authorized JavaScript origins:
     - `http://localhost:5000`
   - Authorized redirect URIs:
     - `http://localhost:5000/api/oauth/google/callback`
   - Clique em **CREATE**
7. Copie o **Client ID** e **Client Secret**
8. Adicione no `.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-seu_client_secret_aqui
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback
```

### 2. Resend (Obrigatório para emails)

**Passo a passo:**

1. Acesse [Resend](https://resend.com/)
2. Clique em **Sign Up** (gratuito - 100 emails/dia)
3. Confirme seu email
4. No dashboard, clique em **API Keys**
5. Clique em **+ Create API Key**
   - Name: **WA-SDR**
   - Permission: **Full access**
   - Clique em **Add**
6. Copie a API Key (começa com `re_`)
7. Adicione no `.env`:

```env
RESEND_API_KEY=re_sua_api_key_aqui
FROM_EMAIL=WA-SDR <onboarding@resend.dev>
```

**Nota:** Para desenvolvimento, use `onboarding@resend.dev`. Para produção, você precisará verificar seu próprio domínio.

### 3. Stripe (Opcional - apenas se for usar pagamentos)

**Passo a passo:**

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Crie uma conta ou faça login
3. No menu superior, certifique-se que está em **Test mode** (toggle no canto superior direito)
4. Vá em **Developers** → **API keys**
5. Copie as chaves:
   - **Secret key** (começa com `sk_test_`)
   - **Publishable key** (começa com `pk_test_`)
6. Configure webhook:
   - Vá em **Developers** → **Webhooks**
   - Clique em **+ Add endpoint**
   - Endpoint URL: `http://localhost:5000/api/webhooks/stripe` (para dev)
   - Selecione eventos:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Clique em **Add endpoint**
   - Copie o **Signing secret** (começa com `whsec_`)
7. Adicione no `.env`:

```env
STRIPE_SECRET_KEY=sk_test_sua_secret_key_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_publishable_key_aqui
```

### 4. Manus OAuth (Opcional - se você usar)

Se você já tem configurado, adicione no `.env`:

```env
VITE_APP_ID=seu_app_id_manus
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
BUILT_IN_FORGE_API_KEY=sua_forge_api_key
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
```

### 5. JWT Secret (Obrigatório)

Gere uma string aleatória segura:

```bash
# No terminal:
openssl rand -base64 32
```

Ou use qualquer string aleatória com pelo menos 32 caracteres.

Adicione no `.env`:

```env
JWT_SECRET=sua_string_aleatoria_segura_aqui
```

## 🚀 Iniciar o Projeto

Após configurar as variáveis:

```bash
# 1. Instalar dependências
pnpm install

# 2. Aplicar migrations no banco
pnpm drizzle-kit push

# 3. Iniciar servidor de desenvolvimento
pnpm dev
```

Acesse: `http://localhost:5000`

## ✅ Checklist de Configuração

- [ ] Banco de dados configurado (já está ✅)
- [ ] Google OAuth configurado
- [ ] Resend configurado
- [ ] JWT Secret gerado
- [ ] Stripe configurado (opcional)
- [ ] Manus OAuth configurado (opcional)
- [ ] Migrations aplicadas (`pnpm drizzle-kit push`)
- [ ] Servidor rodando (`pnpm dev`)

## 🧪 Testar Funcionalidades

### 1. Testar Registro com Email/Senha

1. Acesse `http://localhost:5000/register`
2. Preencha o formulário
3. Clique em "Criar conta"
4. **Importante:** Verifique o console do servidor para ver o link de verificação de email (já que o Resend pode não estar configurado ainda)
5. Copie o token do link e acesse `http://localhost:5000/verify-email?token=SEU_TOKEN`

### 2. Testar Login com Google

1. Acesse `http://localhost:5000/login`
2. Clique em "Continuar com Google"
3. Selecione sua conta Google
4. Autorize a aplicação

### 3. Testar Recuperação de Senha

1. Acesse `http://localhost:5000/forgot-password`
2. Digite seu email
3. Verifique o console do servidor para o link de recuperação
4. Acesse o link e defina nova senha

## 🐛 Problemas Comuns

### "Email não está sendo enviado"

**Solução:** Configure o Resend corretamente ou verifique o console do servidor para ver os links de verificação/recuperação.

### "Google OAuth não funciona"

**Solução:** 
1. Verifique se o Client ID e Secret estão corretos
2. Verifique se a URL de callback está registrada no Google Cloud Console
3. Certifique-se que está usando `http://localhost:5000` (não `127.0.0.1`)

### "Erro de conexão com banco"

**Solução:** As credenciais do banco já estão corretas. Verifique sua conexão com a internet.

### "Token expirado"

**Solução:** 
- Tokens de verificação de email expiram em 24 horas
- Tokens de reset de senha expiram em 1 hora
- Solicite um novo token

## 📝 Arquivo .env Completo (Template)

```env
# Database (✅ Já configurado)
DATABASE_URL="postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Google OAuth (⚠️ Configure)
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-seu_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback

# Resend (⚠️ Configure)
RESEND_API_KEY=re_sua_api_key
FROM_EMAIL=WA-SDR <onboarding@resend.dev>

# App URLs
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5000

# JWT (⚠️ Gere uma string aleatória)
JWT_SECRET=sua_string_aleatoria_segura_min_32_chars

# Manus OAuth (Opcional)
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
BUILT_IN_FORGE_API_KEY=sua_api_key
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev

# Stripe (Opcional)
STRIPE_SECRET_KEY=sk_test_sua_key
STRIPE_WEBHOOK_SECRET=whsec_seu_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_key

# Environment
NODE_ENV=development
PORT=5000
```

## 🎯 Ordem de Prioridade

Para começar a testar rapidamente:

1. **Essencial:** Google OAuth + Resend + JWT Secret
2. **Opcional:** Stripe (apenas se for testar pagamentos)
3. **Opcional:** Manus OAuth (se você usar)

## 📞 Precisa de Ajuda?

Consulte os documentos:
- `SETUP_AUTH.md` - Guia completo de configuração
- `RESUMO_MELHORIAS.md` - Resumo das implementações
- `AUTH_IMPROVEMENTS_PLAN.md` - Detalhes técnicos

---

**Boa sorte! 🚀**

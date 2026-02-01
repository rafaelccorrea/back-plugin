# 🚀 Referência Rápida de Variáveis de Ambiente - WA-SDR

## Copiar e Colar - Desenvolvimento

```env
# ============================================================================
# DESENVOLVIMENTO LOCAL
# ============================================================================

# Banco de Dados (MySQL Local)
DATABASE_URL=mysql://root:password@localhost:3306/wa_sdr

# OAuth Manus
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
JWT_SECRET=dev_secret_key_min_32_caracteres_aleatorio_aqui
OWNER_OPEN_ID=seu_owner_id
OWNER_NAME=Seu Nome

# Stripe (Chaves de Teste)
STRIPE_SECRET_KEY=sk_test_seu_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_seu_public_key
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret

# OpenAI
OPENAI_API_KEY=sk-proj-seu_openai_key

# Manus APIs
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge
BUILT_IN_FORGE_API_KEY=seu_forge_backend_key
VITE_FRONTEND_FORGE_API_KEY=seu_forge_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge

# Aplicação
NODE_ENV=development
PORT=3000
APP_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_APP_TITLE=WA-SDR Dev
```

---

## Variáveis Obrigatórias vs Opcionais

### ✅ OBRIGATÓRIAS (Aplicação não funciona sem estas)

| Variável | Onde Obter | Prioridade |
|----------|-----------|-----------|
| `DATABASE_URL` | Criar banco MySQL/TiDB | 🔴 CRÍTICA |
| `VITE_APP_ID` | Painel Manus | 🔴 CRÍTICA |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | 🔴 CRÍTICA |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | 🔴 CRÍTICA |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhooks | 🔴 CRÍTICA |
| `OPENAI_API_KEY` | OpenAI Platform | 🔴 CRÍTICA |
| `JWT_SECRET` | Gerar: `openssl rand -base64 32` | 🔴 CRÍTICA |
| `OWNER_OPEN_ID` | Painel Manus | 🟡 IMPORTANTE |
| `OWNER_NAME` | Qualquer valor | 🟡 IMPORTANTE |

### 🟢 OPCIONAIS (Têm valores padrão)

| Variável | Padrão | Quando Customizar |
|----------|--------|-------------------|
| `NODE_ENV` | `development` | Ao fazer deploy |
| `PORT` | `3000` | Se porta 3000 está em uso |
| `APP_URL` | `https://nonmetallic-belinda-thankless.ngrok-free.dev` | Em produção |
| `VITE_APP_TITLE` | `WA-SDR` | Para branding customizado |
| `VITE_APP_LOGO` | `/logo.svg` | Para logo customizado |

---

## Passo a Passo - Primeira Configuração

### 1️⃣ Banco de Dados (5 min)

```bash
# Opção A: MySQL Local
mysql -u root -p
CREATE DATABASE wa_sdr;
CREATE USER 'wa_sdr'@'localhost' IDENTIFIED BY 'senha123';
GRANT ALL PRIVILEGES ON wa_sdr.* TO 'wa_sdr'@'localhost';
FLUSH PRIVILEGES;

# Copie para .env:
DATABASE_URL=mysql://wa_sdr:senha123@localhost:3306/wa_sdr
```

### 2️⃣ Stripe (10 min)

```bash
# 1. Acesse https://dashboard.stripe.com/apikeys
# 2. Copie as chaves de teste:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# 3. Vá para https://dashboard.stripe.com/webhooks
# 4. Clique "Add endpoint"
# 5. URL: https://nonmetallic-belinda-thankless.ngrok-free.dev/api/webhooks/stripe
# 6. Selecione eventos: customer.subscription.*, invoice.payment_*, charge.refunded
# 7. Copie o signing secret:
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3️⃣ OpenAI (5 min)

```bash
# 1. Acesse https://platform.openai.com/api-keys
# 2. Clique "Create new secret key"
# 3. Copie a chave (exibida apenas uma vez):
OPENAI_API_KEY=sk-proj-...

# 4. (Opcional) Configure limite de gastos:
# Acesse https://platform.openai.com/account/billing/limits
# Configure "Hard limit" para $10-50/mês
```

### 4️⃣ Manus OAuth (5 min)

```bash
# 1. Acesse seu painel Manus
# 2. Copie o APP_ID:
VITE_APP_ID=app_...

# 3. Gere uma chave JWT segura:
openssl rand -base64 32
# Copie o resultado:
JWT_SECRET=...

# 4. Copie suas informações:
OWNER_OPEN_ID=seu_id
OWNER_NAME=Seu Nome
```

### 5️⃣ Manus APIs (2 min)

```bash
# Copie do seu projeto Manus:
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge
BUILT_IN_FORGE_API_KEY=...
VITE_FRONTEND_FORGE_API_KEY=...
VITE_FRONTEND_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge
```

---

## Verificação Rápida

Após configurar todas as variáveis, execute:

```bash
# 1. Verifique se o arquivo .env foi criado
ls -la .env

# 2. Teste a conexão com o banco de dados
pnpm run db:push

# 3. Inicie o servidor
pnpm run dev

# 4. Acesse https://nonmetallic-belinda-thankless.ngrok-free.dev
# Você deve ver a landing page do WA-SDR
```

---

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| `Error: connect ECONNREFUSED` | MySQL não está rodando: `mysql.server start` |
| `Invalid API Key` | Regenere a chave no painel correspondente |
| `Cannot find module` | Execute `pnpm install` |
| `Port 3000 already in use` | Mude `PORT=3001` no .env |
| `Database does not exist` | Execute `pnpm run db:push` |

---

## URLs Importantes

- 🔐 **Stripe**: https://dashboard.stripe.com
- 🤖 **OpenAI**: https://platform.openai.com
- 🔑 **Manus**: https://manus.im
- 📚 **Documentação Stripe**: https://stripe.com/docs
- 📚 **Documentação OpenAI**: https://platform.openai.com/docs

---

## Próximos Passos

1. ✅ Configure todas as variáveis de ambiente
2. ✅ Execute `pnpm install`
3. ✅ Execute `pnpm run db:push`
4. ✅ Execute `pnpm run dev`
5. ✅ Acesse https://nonmetallic-belinda-thankless.ngrok-free.dev
6. ✅ Teste o fluxo de compra com Stripe (chaves de teste)


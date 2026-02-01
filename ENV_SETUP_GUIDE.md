# Guia de Configuração de Variáveis de Ambiente

## 📋 Variáveis Necessárias para ChatLead Pro

### 1. **DATABASE (Supabase PostgreSQL)** ✅ JÁ CONFIGURADO
```
DATABASE_URL=postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

---

### 2. **GOOGLE OAUTH** ⚠️ NECESSÁRIO

**Onde obter:**
1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione existente
3. Vá em "APIs & Services" > "Credentials"
4. Clique em "Create Credentials" > "OAuth 2.0 Client ID"
5. Selecione "Web application"
6. Configure "Authorized redirect URIs":
   - `http://localhost:5000/api/oauth/google/callback` (desenvolvimento)
   - `https://seu-dominio.com/api/oauth/google/callback` (produção)

**Variáveis:**
```
GOOGLE_CLIENT_ID=<seu_client_id>
GOOGLE_CLIENT_SECRET=<seu_client_secret>
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback
```

---

### 3. **EMAIL SERVICE (Resend)** ⚠️ NECESSÁRIO

**Onde obter:**
1. Acesse: https://resend.com/
2. Crie uma conta gratuita
3. Verifique seu domínio (ou use domínio de teste)
4. Vá em "Settings" > "API Keys"
5. Copie sua API Key

**Variáveis:**
```
RESEND_API_KEY=re_<sua_api_key>
FROM_EMAIL=ChatLead Pro <noreply@seu-dominio.com>
```

**Nota:** Para desenvolvimento, você pode usar:
```
FROM_EMAIL=ChatLead Pro <onboarding@resend.dev>
```

---

### 4. **STRIPE (Pagamentos)** ⚠️ NECESSÁRIO

**Onde obter:**
1. Acesse: https://dashboard.stripe.com/
2. Vá em "Developers" > "API keys"
3. Use as chaves de TESTE (começam com `sk_test_` e `pk_test_`)
4. Copie:
   - **Secret Key** (começa com `sk_test_`)
   - **Publishable Key** (começa com `pk_test_`)
5. Configure webhook em "Developers" > "Webhooks"
   - URL: `https://seu-dominio.com/api/webhooks/stripe`
   - Eventos: `customer.subscription.*`, `invoice.*`, `payment_intent.*`
6. Copie o **Webhook Secret** (começa com `whsec_`)

**Variáveis:**
```
STRIPE_SECRET_KEY=sk_test_<sua_secret_key>
STRIPE_WEBHOOK_SECRET=whsec_<seu_webhook_secret>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_<sua_publishable_key>
```

---

### 5. **MANUS OAUTH** ✅ GERALMENTE JÁ CONFIGURADO

**Variáveis (geralmente fornecidas pelo Manus):**
```
VITE_APP_ID=<seu_app_id>
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
BUILT_IN_FORGE_API_KEY=<sua_forge_api_key>
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
OWNER_OPEN_ID=<seu_owner_open_id>
```

---

### 6. **APLICAÇÃO** ⚠️ NECESSÁRIO

**Variáveis:**
```
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5000
NODE_ENV=development
PORT=5000
```

**Para produção:**
```
APP_URL=https://seu-dominio.com
FRONTEND_URL=https://seu-dominio.com
NODE_ENV=production
```

---

### 7. **JWT & SECURITY** ⚠️ NECESSÁRIO

**Gerar JWT_SECRET seguro:**
```bash
# No terminal, execute:
openssl rand -base64 32
```

**Variável:**
```
JWT_SECRET=<sua_string_aleatória_de_32_caracteres>
```

---

## 🚀 Ordem de Prioridade

### Mínimo para começar (MVP):
1. ✅ DATABASE_URL (já configurado)
2. ⚠️ GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
3. ⚠️ RESEND_API_KEY + FROM_EMAIL
4. ⚠️ JWT_SECRET
5. ⚠️ APP_URL + FRONTEND_URL

### Completo (com pagamentos):
6. ⚠️ STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + VITE_STRIPE_PUBLISHABLE_KEY

---

## 📝 Arquivo .env Completo

Copie e preencha este modelo:

```env
# ============================================================================
# DATABASE (PostgreSQL via Supabase)
# ============================================================================
DATABASE_URL=postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.igxwbsswzfxjphesonip:nextinnotech2023@aws-1-us-east-1.pooler.supabase.com:5432/postgres

# ============================================================================
# GOOGLE OAUTH
# ============================================================================
GOOGLE_CLIENT_ID=PREENCHA_AQUI
GOOGLE_CLIENT_SECRET=PREENCHA_AQUI
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback

# ============================================================================
# EMAIL SERVICE (Resend)
# ============================================================================
RESEND_API_KEY=PREENCHA_AQUI
FROM_EMAIL=ChatLead Pro <onboarding@resend.dev>

# ============================================================================
# APPLICATION URLS
# ============================================================================
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5000

# ============================================================================
# JWT & SECURITY
# ============================================================================
JWT_SECRET=PREENCHA_AQUI

# ============================================================================
# MANUS OAUTH
# ============================================================================
VITE_APP_ID=PREENCHA_AQUI
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
BUILT_IN_FORGE_API_KEY=PREENCHA_AQUI
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
OWNER_OPEN_ID=PREENCHA_AQUI

# ============================================================================
# STRIPE (Payment Processing)
# ============================================================================
STRIPE_SECRET_KEY=PREENCHA_AQUI
STRIPE_WEBHOOK_SECRET=PREENCHA_AQUI
VITE_STRIPE_PUBLISHABLE_KEY=PREENCHA_AQUI

# ============================================================================
# ENVIRONMENT
# ============================================================================
NODE_ENV=development
PORT=5000
```

---

## ✅ Checklist de Configuração

- [ ] DATABASE_URL configurado
- [ ] GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET obtidos
- [ ] RESEND_API_KEY obtido
- [ ] JWT_SECRET gerado
- [ ] STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET e VITE_STRIPE_PUBLISHABLE_KEY obtidos
- [ ] APP_URL e FRONTEND_URL configurados
- [ ] MANUS OAuth configurado (se necessário)
- [ ] Arquivo .env criado com todas as variáveis
- [ ] Servidor iniciado com sucesso

---

## 🔗 Links Úteis

| Serviço | URL |
|---------|-----|
| Google Cloud Console | https://console.cloud.google.com/ |
| Resend Dashboard | https://resend.com/ |
| Stripe Dashboard | https://dashboard.stripe.com/ |
| Supabase Dashboard | https://app.supabase.com/ |
| Manus Dashboard | https://nonmetallic-belinda-thankless.ngrok-free.dev |

---

## ❓ Dúvidas Frequentes

### P: Posso usar valores de teste para desenvolvimento?
**R:** Sim! Use `sk_test_` para Stripe e `pk_test_` para desenvolvimento. Mude para valores de produção (`sk_live_`, `pk_live_`) apenas em produção.

### P: Qual é a diferença entre DATABASE_URL e DIRECT_URL?
**R:** 
- `DATABASE_URL`: Usa connection pooling (recomendado para serverless)
- `DIRECT_URL`: Conexão direta (necessária para migrations)

### P: Posso deixar JWT_SECRET em branco?
**R:** Não! Sempre gere uma string segura com pelo menos 32 caracteres.

### P: O que fazer se perder minha API Key?
**R:** Você pode gerar uma nova em qualquer momento nos painéis de controle dos serviços.

---

**Última atualização:** 30 de Janeiro de 2026
**Status:** Pronto para configuração

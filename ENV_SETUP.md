# 🔧 Guia de Configuração de Variáveis de Ambiente - WA-SDR

Este documento detalha todas as variáveis de ambiente necessárias para executar o WA-SDR corretamente em diferentes ambientes (desenvolvimento, staging, produção).

---

## 📋 Sumário

1. [Variáveis Obrigatórias](#variáveis-obrigatórias)
2. [Variáveis Opcionais](#variáveis-opcionais)
3. [Guia de Configuração por Serviço](#guia-de-configuração-por-serviço)
4. [Exemplos de Configuração](#exemplos-de-configuração)
5. [Validação e Troubleshooting](#validação-e-troubleshooting)

---

## 🔴 Variáveis Obrigatórias

Estas variáveis DEVEM ser configuradas para a aplicação funcionar:

### 1. Banco de Dados

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão MySQL/TiDB | `mysql://user:pass@localhost:3306/wa_sdr` |

**Como obter:**
- Crie um banco de dados MySQL/TiDB
- Obtenha as credenciais de acesso
- Formato: `mysql://usuario:senha@host:porta/banco_de_dados`

---

### 2. Autenticação OAuth (Manus)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_APP_ID` | ID da aplicação OAuth | `app_123abc456def` |
| `OAUTH_SERVER_URL` | URL do servidor OAuth | `https://nonmetallic-belinda-thankless.ngrok-free.dev` |
| `VITE_OAUTH_PORTAL_URL` | URL do portal de login | `https://nonmetallic-belinda-thankless.ngrok-free.dev` |
| `JWT_SECRET` | Chave para assinar cookies JWT | `sua_chave_secreta_min_32_caracteres` |
| `OWNER_OPEN_ID` | Open ID do proprietário | `owner_123abc` |
| `OWNER_NAME` | Nome do proprietário | `Rafael Correia` |

**Como obter:**
- Registre sua aplicação no painel Manus
- Copie o `VITE_APP_ID` fornecido
- Gere uma chave JWT segura: `openssl rand -base64 32`

---

### 3. Stripe - Pagamentos

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe | `sk_test_51234567890abcdef` |
| `STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe | `pk_test_51234567890abcdef` |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook | `whsec_1234567890abcdef` |

**Como obter:**
1. Acesse [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copie as chaves de teste (desenvolvimento) ou produção
3. Para webhooks:
   - Vá para [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Crie um novo webhook para `http://seu-dominio/api/webhooks/stripe`
   - Selecione os eventos: `customer.subscription.*`, `invoice.payment_*`, `charge.refunded`
   - Copie o "Signing secret"

---

### 4. OpenAI - Análise de Leads

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `OPENAI_API_KEY` | Chave API do OpenAI | `sk-proj-abc123def456` |

**Como obter:**
1. Acesse [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Clique em "Create new secret key"
3. Copie a chave gerada (será exibida apenas uma vez)

---

### 5. Manus Built-in APIs

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `BUILT_IN_FORGE_API_URL` | URL das APIs internas | `https://nonmetallic-belinda-thankless.ngrok-free.dev/forge` |
| `BUILT_IN_FORGE_API_KEY` | Chave de autenticação (backend) | `forge_key_backend_123` |
| `VITE_FRONTEND_FORGE_API_KEY` | Chave de autenticação (frontend) | `forge_key_frontend_123` |
| `VITE_FRONTEND_FORGE_API_URL` | URL das APIs (frontend) | `https://nonmetallic-belinda-thankless.ngrok-free.dev/forge` |

**Como obter:**
- Fornecidas automaticamente pelo painel Manus
- Copie do seu projeto no Management UI

---

## 🟡 Variáveis Opcionais

Estas variáveis têm valores padrão, mas podem ser customizadas:

| Variável | Descrição | Padrão | Exemplo |
|----------|-----------|--------|---------|
| `NODE_ENV` | Ambiente de execução | `development` | `production` |
| `PORT` | Porta do servidor | `3000` | `8080` |
| `APP_URL` | URL base da aplicação | `https://nonmetallic-belinda-thankless.ngrok-free.dev` | `https://wa-sdr.com` |
| `VITE_APP_TITLE` | Título da aplicação | `WA-SDR` | `WA-SDR - Meu Domínio` |
| `VITE_APP_LOGO` | URL do logo | `/logo.svg` | `https://cdn.example.com/logo.png` |
| `VITE_ANALYTICS_WEBSITE_ID` | ID do analytics | - | `analytics_123` |
| `VITE_ANALYTICS_ENDPOINT` | Endpoint de analytics | - | `https://analytics.manus.im` |

---

## 🔐 Guia de Configuração por Serviço

### Stripe - Configuração Completa

**Passo 1: Obter Chaves de API**
```bash
# Acesse https://dashboard.stripe.com/apikeys
# Copie:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Passo 2: Configurar Webhook**
```bash
# Acesse https://dashboard.stripe.com/webhooks
# Clique em "Add endpoint"
# URL: https://seu-dominio.com/api/webhooks/stripe
# Eventos:
#   - customer.subscription.created
#   - customer.subscription.updated
#   - customer.subscription.deleted
#   - invoice.payment_succeeded
#   - invoice.payment_failed
#   - charge.refunded
# Copie o "Signing secret":
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Passo 3: Testar Webhook Localmente**
```bash
# Use Stripe CLI para testar webhooks em desenvolvimento
# Instale: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copie o webhook secret exibido
```

### OpenAI - Configuração Completa

**Passo 1: Criar Chave API**
```bash
# Acesse https://platform.openai.com/api-keys
# Clique em "Create new secret key"
# Copie a chave (será exibida apenas uma vez)
OPENAI_API_KEY=sk-proj-...
```

**Passo 2: Configurar Limites de Uso (Opcional)**
```bash
# Acesse https://platform.openai.com/account/billing/limits
# Configure "Hard limit" para controlar gastos
# Recomendado: $10-50/mês para testes
```

### Banco de Dados - Configuração Completa

**Opção 1: MySQL Local**
```bash
# Instale MySQL
mysql -u root -p

# Crie o banco de dados
CREATE DATABASE wa_sdr;
CREATE USER 'wa_sdr'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON wa_sdr.* TO 'wa_sdr'@'localhost';
FLUSH PRIVILEGES;

# Configure a variável
DATABASE_URL=mysql://wa_sdr:sua_senha_segura@localhost:3306/wa_sdr
```

**Opção 2: PlanetScale (MySQL compatível)**
```bash
# Acesse https://planetscale.com
# Crie um banco de dados
# Copie a string de conexão
DATABASE_URL=mysql://usuario:senha@host.connect.psdb.cloud/banco_de_dados?sslaccept=strict
```

**Opção 3: TiDB Cloud**
```bash
# Acesse https://tidbcloud.com
# Crie um cluster
# Copie a string de conexão
DATABASE_URL=mysql://usuario:senha@host.tidbcloud.com:4000/banco_de_dados?sslMode=verify_identity
```

---

## 📝 Exemplos de Configuração

### Exemplo 1: Desenvolvimento Local

```env
# Banco de Dados
DATABASE_URL=mysql://root:password@localhost:3306/wa_sdr_dev

# OAuth (Manus)
VITE_APP_ID=app_dev_123456
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
JWT_SECRET=dev_secret_key_min_32_caracteres_aqui_ok
OWNER_OPEN_ID=dev_owner_123
OWNER_NAME=Dev User

# Stripe (Chaves de Teste)
STRIPE_SECRET_KEY=sk_test_51234567890abcdef
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdef

# OpenAI
OPENAI_API_KEY=sk-proj-abc123def456

# Manus APIs
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge
BUILT_IN_FORGE_API_KEY=forge_key_dev_123
VITE_FRONTEND_FORGE_API_KEY=forge_key_frontend_dev_123
VITE_FRONTEND_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge

# Aplicação
NODE_ENV=development
PORT=3000
APP_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_APP_TITLE=WA-SDR Dev
```

### Exemplo 2: Produção

```env
# Banco de Dados (PlanetScale)
DATABASE_URL=mysql://user:pass@aws.connect.psdb.cloud/wa_sdr_prod?sslaccept=strict

# OAuth (Manus)
VITE_APP_ID=app_prod_789012
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
JWT_SECRET=prod_secret_key_super_segura_min_32_caracteres_aleatorio
OWNER_OPEN_ID=prod_owner_789
OWNER_NAME=Rafael Correia

# Stripe (Chaves de Produção)
STRIPE_SECRET_KEY=sk_live_51234567890abcdef
STRIPE_PUBLISHABLE_KEY=pk_live_51234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_live_1234567890abcdef

# OpenAI
OPENAI_API_KEY=sk-proj-production-key-123

# Manus APIs
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge
BUILT_IN_FORGE_API_KEY=forge_key_prod_789
VITE_FRONTEND_FORGE_API_KEY=forge_key_frontend_prod_789
VITE_FRONTEND_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev/forge

# Aplicação
NODE_ENV=production
PORT=3000
APP_URL=https://wa-sdr.com
VITE_APP_TITLE=WA-SDR
VITE_APP_LOGO=https://cdn.wa-sdr.com/logo.svg
```

---

## ✅ Validação e Troubleshooting

### Checklist de Validação

Antes de iniciar a aplicação, verifique:

- [ ] `DATABASE_URL` está correto e o banco de dados é acessível
- [ ] `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY` são válidos
- [ ] `STRIPE_WEBHOOK_SECRET` foi configurado corretamente
- [ ] `OPENAI_API_KEY` é válido e tem saldo disponível
- [ ] `VITE_APP_ID` foi registrado no painel Manus
- [ ] `JWT_SECRET` tem pelo menos 32 caracteres
- [ ] Todas as URLs estão com `https://` em produção
- [ ] Não há espaços em branco nas variáveis

### Teste de Conexão

```bash
# Testar conexão com banco de dados
pnpm run db:push

# Testar servidor
pnpm run dev

# Testar endpoint de análise
curl -X POST https://nonmetallic-belinda-thankless.ngrok-free.dev/api/trpc/leads.analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key" \
  -d '{"conversation": "Olá, estou procurando um apartamento em São Paulo"}'
```

### Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `Error: connect ECONNREFUSED` | Banco de dados não está acessível | Verifique `DATABASE_URL` e se o MySQL está rodando |
| `Invalid API Key` | Chave do Stripe/OpenAI inválida | Regenere a chave no painel correspondente |
| `CORS error` | Origem não autorizada | Configure `APP_URL` corretamente |
| `Webhook signature verification failed` | `STRIPE_WEBHOOK_SECRET` incorreto | Copie novamente do painel Stripe |
| `JWT_SECRET too short` | Chave JWT com menos de 32 caracteres | Gere uma nova: `openssl rand -base64 32` |

---

## 🔒 Boas Práticas de Segurança

1. **Nunca comita `.env` em repositórios públicos**
   ```bash
   # Adicione ao .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use variáveis diferentes por ambiente**
   - Desenvolvimento: chaves de teste
   - Staging: chaves de teste/produção
   - Produção: chaves de produção

3. **Rotacione chaves regularmente**
   - Stripe: a cada 90 dias
   - OpenAI: a cada 60 dias
   - JWT_SECRET: após cada deploy crítico

4. **Use gerenciador de secrets em produção**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Cloud Secret Manager

5. **Monitore uso de APIs**
   - Configure alertas no Stripe para gastos anormais
   - Monitore quota do OpenAI
   - Revise logs de acesso regularmente

---

## 📞 Suporte

Se encontrar problemas ao configurar as variáveis de ambiente:

1. Verifique este documento novamente
2. Consulte a documentação oficial de cada serviço
3. Verifique os logs: `tail -f .manus-logs/devserver.log`
4. Abra uma issue no repositório do projeto


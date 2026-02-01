# 🔑 Como Obter as Chaves do Stripe

## 📊 Informações da Conta

Sua conta Stripe está conectada:
- **Account ID:** `acct_1POlIN062D6EViqG`
- **Dashboard:** [https://dashboard.stripe.com/acct_1POlIN062D6EViqG/apikeys](https://dashboard.stripe.com/acct_1POlIN062D6EViqG/apikeys)

## 🚀 Passo a Passo para Obter as Chaves

### 1. Acessar o Dashboard

1. Acesse: [https://dashboard.stripe.com/acct_1POlIN062D6EViqG/apikeys](https://dashboard.stripe.com/acct_1POlIN062D6EViqG/apikeys)
2. Faça login com suas credenciais Stripe

### 2. Modo de Teste vs Produção

No canto superior direito do dashboard, você verá um toggle:
- **Test mode** (modo de teste) - Use para desenvolvimento
- **Live mode** (modo produção) - Use apenas em produção

**Recomendação:** Comece com **Test mode** ativado.

### 3. Copiar as Chaves de API

Na página de API Keys, você verá:

#### Secret Key (Chave Secreta)
- **Test mode:** Começa com `sk_test_...`
- **Live mode:** Começa com `sk_live_...`
- ⚠️ **NUNCA compartilhe esta chave publicamente!**
- Clique em "Reveal test key" para ver a chave
- Copie e cole no `.env` como `STRIPE_SECRET_KEY`

#### Publishable Key (Chave Pública)
- **Test mode:** Começa com `pk_test_...`
- **Live mode:** Começa com `pk_live_...`
- Esta chave pode ser exposta no frontend
- Copie e cole no `.env` como `VITE_STRIPE_PUBLISHABLE_KEY`

### 4. Configurar Webhook

Os webhooks são necessários para receber notificações de eventos do Stripe (pagamentos, assinaturas, etc).

#### Para Desenvolvimento Local (usando Stripe CLI):

1. Instale o Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Linux
   wget https://github.com/stripe/stripe-cli/releases/download/v1.19.5/stripe_1.19.5_linux_x86_64.tar.gz
   tar -xvf stripe_1.19.5_linux_x86_64.tar.gz
   sudo mv stripe /usr/local/bin/
   ```

2. Faça login:
   ```bash
   stripe login
   ```

3. Encaminhe webhooks para seu servidor local:
   ```bash
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```

4. O CLI mostrará um **webhook signing secret** (começa com `whsec_`)
5. Copie e cole no `.env` como `STRIPE_WEBHOOK_SECRET`

#### Para Produção:

1. No dashboard, vá para: **Developers** → **Webhooks**
2. Clique em **+ Add endpoint**
3. Configure:
   - **Endpoint URL:** `https://seu-dominio.com/api/webhooks/stripe`
   - **Events to send:** Selecione:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
4. Clique em **Add endpoint**
5. Copie o **Signing secret** (começa com `whsec_`)
6. Adicione no `.env` de produção como `STRIPE_WEBHOOK_SECRET`

## 📝 Atualizar o .env

Após obter as chaves, atualize seu arquivo `.env`:

```env
# ============================================================================
# STRIPE (Payment Processing)
# ============================================================================
# Secret Key (NUNCA compartilhe!)
STRIPE_SECRET_KEY=sk_test_sua_secret_key_aqui

# Webhook Secret (do Stripe CLI ou dashboard)
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui

# Publishable Key (pode ser exposta no frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_publishable_key_aqui
```

## 🧪 Testar a Integração

### 1. Verificar Conexão

Após configurar as chaves, inicie o servidor:

```bash
pnpm dev
```

### 2. Testar com Cartões de Teste

O Stripe fornece cartões de teste para desenvolvimento:

**Cartão de Sucesso:**
- Número: `4242 4242 4242 4242`
- Data: Qualquer data futura (ex: `12/34`)
- CVC: Qualquer 3 dígitos (ex: `123`)
- CEP: Qualquer (ex: `12345`)

**Cartão que Requer Autenticação:**
- Número: `4000 0025 0000 3155`

**Cartão que Falha:**
- Número: `4000 0000 0000 9995`

[Lista completa de cartões de teste](https://stripe.com/docs/testing#cards)

### 3. Monitorar Webhooks

Se estiver usando Stripe CLI:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

Você verá os eventos em tempo real no terminal.

## 🔐 Segurança

### ✅ Boas Práticas

1. **NUNCA** commite chaves secretas no Git
2. Use **Test mode** para desenvolvimento
3. Use **Live mode** apenas em produção
4. Rotacione chaves regularmente
5. Use HTTPS em produção
6. Valide webhooks com o signing secret
7. Mantenha o Stripe SDK atualizado

### ⚠️ O que NUNCA fazer

- ❌ Compartilhar `STRIPE_SECRET_KEY` publicamente
- ❌ Usar chaves de produção em desenvolvimento
- ❌ Commitar `.env` no Git
- ❌ Expor chaves secretas no frontend
- ❌ Ignorar erros de webhook signature

## 📊 Monitoramento

### Dashboard do Stripe

Acesse: [https://dashboard.stripe.com/acct_1POlIN062D6EViqG](https://dashboard.stripe.com/acct_1POlIN062D6EViqG)

Você pode monitorar:
- **Payments** - Pagamentos recebidos
- **Customers** - Clientes cadastrados
- **Subscriptions** - Assinaturas ativas
- **Invoices** - Faturas geradas
- **Logs** - Logs de API e webhooks

### Logs de Webhook

Para ver se os webhooks estão funcionando:
1. Vá em **Developers** → **Webhooks**
2. Clique no seu endpoint
3. Veja a aba **Attempts** para ver tentativas de entrega

## 🎯 Próximos Passos

Após configurar o Stripe:

1. ✅ Copie as chaves do dashboard
2. ✅ Atualize o `.env`
3. ✅ Configure webhooks
4. ✅ Teste com cartões de teste
5. ✅ Crie produtos e preços no dashboard
6. ✅ Implemente checkout no frontend

## 📚 Recursos Úteis

- [Documentação Stripe](https://stripe.com/docs)
- [Cartões de Teste](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Dashboard](https://dashboard.stripe.com/acct_1POlIN062D6EViqG)

## 💡 Dicas

### Criar Produtos de Teste

No dashboard, vá em **Products** → **+ Add product**:

1. **Nome:** Plano Básico
2. **Descrição:** Acesso básico ao WA-SDR
3. **Pricing:** 
   - Modelo: Recurring (Recorrente)
   - Preço: R$ 29,90
   - Intervalo: Monthly (Mensal)
4. Salve e copie o **Price ID** (começa com `price_`)

### Testar Assinatura

```javascript
// No frontend
const stripe = await loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);
const { error } = await stripe.redirectToCheckout({
  lineItems: [{ price: 'price_seu_price_id', quantity: 1 }],
  mode: 'subscription',
  successUrl: 'http://localhost:5000/checkout-success',
  cancelUrl: 'http://localhost:5000/pricing',
});
```

---

**Precisa de ajuda?** Consulte a [documentação do Stripe](https://stripe.com/docs) ou entre em contato com o suporte.

# Guia Completo: Configuração do Stripe para Produção

## 📋 Resumo Executivo

Este guia detalha como configurar o Stripe em produção para o ChatLead Pro. Você precisará obter chaves `sk_live_` (Secret) e `pk_live_` (Publishable) do Stripe.

---

## 🔐 Chaves Obtidas do Stripe (Teste)

### Chaves de Teste Atuais:
```
Publishable Key (pk_test_):
pk_test_51Sv99pFu6ngAE0Tn... (obtida do painel Stripe)

Secret Key (sk_test_):
sk_test_51Sv99pFu6ngAE0Tn... (obtida do painel Stripe)
```

⚠️ **NOTA**: As chaves reais estão configuradas em `.env.development` (não commitado)

---

## 🚀 Passo-a-Passo: Obter Chaves de Produção

### Passo 1: Acessar Dashboard do Stripe
1. Acesse: https://dashboard.stripe.com/
2. Você verá um aviso "Você está testando em uma área restrita"
3. Clique em **"Alternar para conta de produção"** (canto superior direito)

### Passo 2: Ativar Modo de Produção
1. Confirme que deseja ativar modo de produção
2. Complete qualquer verificação adicional necessária
3. Você será redirecionado para o dashboard de produção

### Passo 3: Obter Chaves de Produção
1. Vá em **Configurações** > **Desenvolvedores** > **Chaves de API**
2. Você verá as chaves de produção (começam com `sk_live_` e `pk_live_`)
3. Copie:
   - **Secret Key** (sk_live_...)
   - **Publishable Key** (pk_live_...)

### Passo 4: Configurar Webhook
1. Vá em **Configurações** > **Desenvolvedores** > **Webhooks**
2. Clique em **"Adicionar endpoint"**
3. Configure:
   - **URL**: `https://seu-dominio.com/api/webhooks/stripe`
   - **Versão da API**: Use a mais recente
   - **Eventos**: Selecione:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
4. Clique em **"Criar endpoint"**
5. Copie o **Webhook Secret** (começa com `whsec_`)

---

## 📝 Configurar Variáveis de Ambiente

### Arquivo `.env.production`:

```env
# STRIPE - PRODUÇÃO
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
```

⚠️ **IMPORTANTE**: Nunca commite chaves reais. Configure no seu hosting (Vercel, Railway, etc)

---

## 🔧 Configuração no Hosting

### VERCEL
1. Vá em **Settings** > **Environment Variables**
2. Adicione cada variável:
   - Nome: `STRIPE_SECRET_KEY`
   - Valor: `sk_live_...`
   - Ambiente: Production
3. Repita para `STRIPE_WEBHOOK_SECRET` e `VITE_STRIPE_PUBLISHABLE_KEY`
4. Faça deploy

### RAILWAY
1. Vá em **Variables**
2. Clique em **"Add Variable"**
3. Adicione cada variável
4. Faça deploy

### RENDER
1. Vá em **Environment**
2. Clique em **"Add Environment Variable"**
3. Adicione cada variável
4. Faça deploy

### HEROKU
```bash
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## ✅ Checklist de Verificação

Após configurar, teste:

- [ ] Login funciona
- [ ] Página de preços carrega
- [ ] Botão "Assinar" funciona
- [ ] Checkout do Stripe abre
- [ ] Teste de pagamento com cartão: `4242 4242 4242 4242`
  - Data: Qualquer data futura (ex: 12/25)
  - CVC: Qualquer 3 dígitos (ex: 123)
- [ ] Webhook recebe notificações
- [ ] Assinatura criada no banco de dados
- [ ] Email de confirmação enviado

---

## 🧪 Teste de Pagamento

### Cartões de Teste Stripe (Produção):

| Cenário | Cartão | Resultado |
|---------|--------|-----------|
| Sucesso | 4242 4242 4242 4242 | Pagamento bem-sucedido |
| Recusado | 4000 0000 0000 0002 | Cartão recusado |
| Expirado | 4000 0000 0000 0069 | Cartão expirado |
| 3D Secure | 4000 0025 0000 3155 | Requer autenticação |

**Data de Expiração**: Qualquer data futura (ex: 12/25)
**CVC**: Qualquer 3 dígitos (ex: 123)

---

## 🔍 Troubleshooting

### Erro: "Invalid API Key"
- Verifique se está usando `sk_live_` (não `sk_test_`)
- Copie a chave completa sem espaços

### Erro: "Webhook signature verification failed"
- Verifique se o `STRIPE_WEBHOOK_SECRET` está correto
- Certifique-se de que a URL do webhook é acessível publicamente

### Pagamento não funciona
- Verifique se `VITE_STRIPE_PUBLISHABLE_KEY` está correto
- Confirme que está usando `pk_live_` (não `pk_test_`)
- Verifique logs de erro no Stripe Dashboard

### Webhook não recebe eventos
- Confirme que a URL é acessível (teste com `curl`)
- Verifique logs em **Developers** > **Webhooks** > **Endpoint**
- Certifique-se de que o endpoint retorna status 200

---

## 📊 Monitoramento

### Verificar Transações:
1. Vá em **Pagamentos** > **Transações**
2. Filtre por data/status
3. Clique em uma transação para ver detalhes

### Verificar Assinaturas:
1. Vá em **Clientes**
2. Selecione um cliente
3. Veja assinaturas ativas/canceladas

### Verificar Webhooks:
1. Vá em **Developers** > **Webhooks**
2. Clique no endpoint
3. Veja histórico de eventos entregues/falhados

---

## 🚨 Segurança

### Boas Práticas:
1. ✅ Nunca commite chaves no Git
2. ✅ Use variáveis de ambiente
3. ✅ Rotacione chaves regularmente
4. ✅ Monitore atividade suspeita
5. ✅ Habilite 2FA no Stripe
6. ✅ Configure IP whitelist se possível
7. ✅ Use HTTPS em produção
8. ✅ Valide webhooks com assinatura

### Rotação de Chaves:
1. Gere uma nova chave no Stripe
2. Atualize variáveis de ambiente
3. Faça deploy
4. Aguarde 24h
5. Desative chave antiga

---

## 📞 Suporte

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Status Page**: https://status.stripe.com

---

**Última atualização**: 30 de Janeiro de 2026
**Status**: Pronto para produção

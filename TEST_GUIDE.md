# 🧪 Guia de Teste - ChatLead Pro

## Fluxo de Autenticação e Compra

Este guia explica como testar o fluxo completo de autenticação, análise de sentimento e escalação inteligente.

---

## 📋 Pré-requisitos

1. **Servidor rodando** em `http://localhost:5000`
   ```bash
   cd whatsapp-lead-plugin
   pnpm dev
   ```

2. **cURL instalado** (para rodar os testes)

3. **jq instalado** (opcional, para formatar JSON)
   ```bash
   # Windows (com Chocolatey)
   choco install jq
   
   # macOS
   brew install jq
   
   # Linux
   sudo apt-get install jq
   ```

---

## 🚀 Teste 1: Fluxo Completo Automatizado

Execute o script de teste que faz todo o fluxo automaticamente:

```bash
./test-auth-flow.sh
```

**O que o script faz:**
1. ✅ Faz login e obtém token JWT
2. ✅ Testa listagem de leads com token
3. ✅ Testa análise de sentimento
4. ✅ Testa escalação inteligente
5. ✅ Verifica se requisições sem token são rejeitadas

---

## 🔐 Teste 2: Login Manual com cURL

### Passo 1: Fazer Login

```bash
curl -X POST "http://localhost:5000/api/trpc/auth.login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "next.innotech2023@gmail.com",
    "password": "11031998Ra@"
  }'
```

**Resposta esperada:**
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "message": "Login realizado com sucesso",
        "data": {
          "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "user": {
            "id": 4,
            "email": "next.innotech2023@gmail.com",
            "name": "Rafael Gustavo Correa"
          }
        }
      }
    }
  }
}
```

**Copie o `accessToken` para usar nos próximos passos.**

---

### Passo 2: Listar Leads com Token

```bash
# Substitua TOKEN pelo token obtido no Passo 1
TOKEN="seu_token_aqui"

curl -X POST "http://localhost:5000/api/trpc/leads.list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'
```

**Resposta esperada:**
```json
{
  "result": {
    "data": {
      "json": {
        "leads": [
          {
            "id": 1,
            "name": "Lead 1",
            "email": "lead1@example.com",
            ...
          }
        ]
      }
    }
  }
}
```

---

### Passo 3: Analisar Sentimento

```bash
TOKEN="seu_token_aqui"

curl -X POST "http://localhost:5000/api/trpc/sentiment.analyze" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Adorei o produto! Muito bom mesmo!",
    "conversationId": "conv_test_123"
  }'
```

**Resposta esperada:**
```json
{
  "result": {
    "data": {
      "json": {
        "score": 0.95,
        "sentiment": "positive",
        "confidence": 0.98,
        "urgency": "low",
        "keywords": ["adorei", "bom"],
        "suggestedResponse": "Obrigado! Fico feliz que tenha gostado!"
      }
    }
  }
}
```

---

### Passo 4: Verificar Escalação

```bash
TOKEN="seu_token_aqui"

curl -X POST "http://localhost:5000/api/trpc/escalation.checkEscalation" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sentiment": "negative",
    "urgency": "high",
    "conversationId": "conv_test_456"
  }'
```

**Resposta esperada:**
```json
{
  "result": {
    "data": {
      "json": {
        "shouldEscalate": true,
        "reason": "Sentimento negativo com urgência alta",
        "alert": {
          "id": "alert_123",
          "severity": "high",
          "message": "Cliente insatisfeito - escalação recomendada"
        }
      }
    }
  }
}
```

---

## 🔍 Teste 3: Verificar Proteção (Sem Token)

Tente acessar uma rota protegida sem token - deve retornar erro:

```bash
curl -X POST "http://localhost:5000/api/trpc/leads.list" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resposta esperada (erro 401):**
```json
{
  "error": {
    "json": {
      "message": "Please login (10001)",
      "code": -32001,
      "data": {
        "code": "UNAUTHORIZED",
        "httpStatus": 401
      }
    }
  }
}
```

---

## 📊 Teste 4: Fluxo de Compra (Checkout)

### Passo 1: Criar Sessão de Checkout

```bash
TOKEN="seu_token_aqui"

curl -X POST "http://localhost:5000/api/trpc/checkout.createSession" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planId": "starter",
    "successUrl": "http://localhost:5000/checkout-success",
    "cancelUrl": "http://localhost:5000/pricing"
  }'
```

**Resposta esperada:**
```json
{
  "result": {
    "data": {
      "json": {
        "sessionId": "cs_test_123456789",
        "url": "https://checkout.stripe.com/pay/cs_test_123456789"
      }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Erro: "Connection refused"
- Certifique-se de que o servidor está rodando: `pnpm dev`
- Verifique se está na porta correta: `http://localhost:5000`

### Erro: "Token inválido"
- Verifique se o token está correto
- Verifique se o token não expirou (15 minutos)
- Faça login novamente para obter um novo token

### Erro: "User not found"
- Verifique se o usuário existe no banco de dados
- Tente fazer registro primeiro: `/api/trpc/auth.register`

### Erro: "Database connection failed"
- Verifique se o Supabase está acessível
- Verifique se as variáveis de ambiente estão corretas
- Verifique se o DATABASE_URL está configurado

---

## 📝 Logs de Debug

Para ver os logs de debug do servidor, observe o console onde você rodou `pnpm dev`:

```
[Context] Authorization header: Presente
[Context] Token encontrado, verificando...
[Context] Token válido, buscando usuário: 4
[Context] Usuário encontrado: next.innotech2023@gmail.com
[Context] Usuário final: next.innotech2023@gmail.com
```

---

## ✅ Checklist de Testes

- [ ] Login retorna token JWT
- [ ] Token é aceito nas requisições
- [ ] Leads são listados com token
- [ ] Análise de sentimento funciona
- [ ] Escalação funciona
- [ ] Requisições sem token são rejeitadas
- [ ] Checkout cria sessão Stripe
- [ ] Webhook de pagamento funciona

---

## 🎯 Próximos Passos

Após validar o fluxo de autenticação:

1. **Testar no Frontend**
   - Abra http://localhost:5000 no navegador
   - Faça login
   - Acesse a página de leads
   - Teste o chat com análise de sentimento

2. **Testar Checkout**
   - Acesse a página de pricing
   - Clique em "Comprar"
   - Complete o checkout no Stripe (use cartão de teste)

3. **Testar Chat**
   - Envie mensagens no chat
   - Observe a análise de sentimento em tempo real
   - Teste a escalação para atendente

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do servidor (`pnpm dev`)
2. Console do navegador (F12)
3. Network tab (F12 → Network)
4. Variáveis de ambiente (.env)
5. Conexão com banco de dados

---

**Boa sorte nos testes! 🚀**

# 🔐 Guia de Autenticação Robusta para Produção

## Objetivo
Implementar um sistema de autenticação seguro, escalável e pronto para produção no ChatLead Pro.

---

## 📋 Checklist de Implementação

### FASE 1: Banco de Dados (Supabase)
- [ ] Conectar ao Supabase PostgreSQL
- [ ] Executar migrações Drizzle
- [ ] Criar tabelas de usuários com campos de segurança
- [ ] Criar índices para performance
- [ ] Configurar Row Level Security (RLS)

### FASE 2: Autenticação
- [ ] Implementar registro de usuário com validação
- [ ] Implementar login com email/senha
- [ ] Implementar JWT tokens com expiração
- [ ] Implementar refresh tokens
- [ ] Implementar logout seguro
- [ ] Implementar recuperação de senha
- [ ] Implementar verificação de email

### FASE 3: Segurança
- [ ] Hash de senhas com bcrypt
- [ ] CSRF protection
- [ ] Rate limiting em endpoints de autenticação
- [ ] Validação de entrada em todos os endpoints
- [ ] Sanitização de dados
- [ ] CORS configurado corretamente

### FASE 4: Stripe Integration
- [ ] Criar customer no Stripe ao registrar
- [ ] Implementar checkout session
- [ ] Implementar webhook de pagamento
- [ ] Atualizar subscription no banco de dados
- [ ] Implementar cancelamento de subscription
- [ ] Implementar portal de billing

### FASE 5: Proteção de Rotas
- [ ] Middleware de autenticação em rotas protegidas
- [ ] Middleware de autorização (verificar subscription)
- [ ] Middleware de rate limiting
- [ ] Middleware de validação de entrada

### FASE 6: Testes
- [ ] Testar registro com dados válidos
- [ ] Testar registro com dados inválidos
- [ ] Testar login com credenciais corretas
- [ ] Testar login com credenciais incorretas
- [ ] Testar fluxo de compra completo
- [ ] Testar webhook do Stripe
- [ ] Testar recuperação de senha

---

## 🔧 Implementação Técnica

### Estrutura de Usuário
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPlanId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn?: Date;
}
```

### Fluxo de Autenticação
1. **Registro**: Email + Senha → Hash → Salvar no BD → Enviar email de verificação
2. **Login**: Email + Senha → Validar → Gerar JWT + Refresh Token → Retornar tokens
3. **Refresh**: Refresh Token → Validar → Gerar novo JWT → Retornar novo JWT
4. **Logout**: Invalidar tokens (opcional, depende da estratégia)

### Fluxo de Compra
1. **Checkout**: Usuário clica em plano → Criar sessão Stripe → Redirecionar para Stripe
2. **Pagamento**: Stripe processa pagamento → Webhook confirma → Atualizar subscription no BD
3. **Acesso**: Verificar subscription ao acessar recursos protegidos

---

## 🛡️ Boas Práticas de Segurança

### Senhas
- ✅ Hash com bcrypt (rounds: 12)
- ✅ Nunca armazenar senha em plain text
- ✅ Validar força da senha (mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial)

### Tokens
- ✅ JWT com expiração curta (15 minutos)
- ✅ Refresh token com expiração longa (7 dias)
- ✅ Armazenar refresh token em HTTP-only cookie
- ✅ Usar HTTPS em produção

### Rate Limiting
- ✅ Limitar tentativas de login (5 por minuto por IP)
- ✅ Limitar tentativas de registro (3 por hora por IP)
- ✅ Limitar tentativas de recuperação de senha (3 por hora por email)

### Validação
- ✅ Validar email com regex
- ✅ Validar força de senha
- ✅ Sanitizar entrada do usuário
- ✅ Validar tamanho de campos

### CORS
- ✅ Permitir apenas domínios conhecidos
- ✅ Não permitir credenciais de domínios desconhecidos
- ✅ Usar preflight requests

---

## 📊 Variáveis de Ambiente Necessárias

```env
# Database
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="seu-secret-super-seguro"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@chatlead.pro"

# URLs
FRONTEND_URL="https://chatlead.pro"
BACKEND_URL="https://api.chatlead.pro"
```

---

## 🚀 Deploy em Produção

### Vercel
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Deploy automático em push

### Railway / Render
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Deploy automático em push

### Checklist Final
- [ ] HTTPS habilitado
- [ ] CORS configurado
- [ ] Rate limiting ativo
- [ ] Logs de segurança
- [ ] Backup automático do BD
- [ ] Monitoramento de erros (Sentry)
- [ ] Monitoramento de performance (New Relic)

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- Documentação Supabase: https://supabase.com/docs
- Documentação Stripe: https://stripe.com/docs
- Documentação JWT: https://jwt.io

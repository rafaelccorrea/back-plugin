# Auditoria Completa - ChatLead Pro

## Data: 30/01/2026

---

## 1. PROBLEMAS DE ARQUITETURA

### 1.1 Falta de Separação de Usuários
- [ ] **CRÍTICO**: Não existe separação entre Usuário Master (Admin) e Usuário Comprador (Cliente)
- [ ] Schema tem `role: ["user", "admin"]` mas não está sendo usado corretamente
- [ ] Todas as rotas são acessíveis por qualquer usuário logado
- [ ] Não existe painel administrativo dedicado

**Solução Proposta:**
```
MASTER (Admin/Você):
├── /admin/dashboard - Visão geral do sistema
├── /admin/users - Gerenciar todos os usuários
├── /admin/subscriptions - Ver assinaturas e faturamento
├── /admin/support - Responder dúvidas dos clientes
├── /admin/analytics - Métricas globais do sistema
└── /admin/settings - Configurações do sistema

COMPRADOR (Cliente):
├── /dashboard - Dashboard pessoal
├── /leads - Seus leads
├── /conversations - Suas conversas
├── /analytics - Suas métricas
├── /settings - Configurações da conta
└── /billing - Seu plano e faturamento
```

---

## 2. INCONSISTÊNCIAS DE DESIGN

### 2.1 Temas Inconsistentes (DARK vs LIGHT)

| Página | Tema Atual | Deveria Ser |
|--------|-----------|-------------|
| Landing.tsx | ✅ Dark | Dark |
| Pricing.tsx | ✅ Dark | Dark |
| Login.tsx | ✅ Dark | Dark |
| Register.tsx | ✅ Dark | Dark |
| ForgotPassword.tsx | ✅ Dark | Dark |
| ResetPassword.tsx | ✅ Dark | Dark |
| VerifyEmail.tsx | ✅ Dark | Dark |
| **NotFound.tsx** | ❌ Light (bg-slate-50, bg-white) | Dark |
| **Onboarding.tsx** | ❌ Light (bg-slate-50, bg-white) | Dark |
| **CheckoutSuccess.tsx** | ❌ Light (bg-green-50, text-slate-600) | Dark |
| Settings.tsx | ⚠️ Usa DashboardLayout | Verificar |
| Leads.tsx | ⚠️ Usa DashboardLayout | Verificar |
| Analytics.tsx | ⚠️ Usa DashboardLayout | Verificar |
| UsageDashboard.tsx | ⚠️ Usa bg-slate-200 em loading | Dark |

### 2.2 Cores Hardcoded vs Design Tokens
- [ ] Muitas cores hardcoded (slate-600, slate-900, etc.)
- [ ] Não usa variáveis CSS consistentes
- [ ] Falta padronização de gradientes

---

## 3. TELAS FALTANTES OU INCOMPLETAS

### 3.1 Telas que NÃO EXISTEM
- [ ] `/dashboard` - Dashboard principal do usuário
- [ ] `/conversations` - Lista de conversas
- [ ] `/conversation/:id` - Detalhe da conversa
- [ ] `/automations` - Automações
- [ ] `/help` - Central de ajuda
- [ ] `/admin/*` - Todo o painel administrativo

### 3.2 Telas que EXISTEM mas estão INCOMPLETAS
- [ ] `Settings.tsx` - Falta integração real com backend
- [ ] `Analytics.tsx` - Verificar se dados são reais
- [ ] `UsageDashboard.tsx` - Verificar integração
- [ ] `Checkout.tsx` - Erro na integração Stripe

### 3.3 Sidebar/Navegação
- [ ] Sidebar mostra itens que não existem (Dashboard, Conversas, Automações, Ajuda)
- [ ] Clique nesses itens não leva a lugar nenhum ou dá erro

---

## 4. PROBLEMAS DE RESPONSIVIDADE

### 4.1 Telas com Problemas de Mobile
- [ ] Landing.tsx - Verificar hero section em mobile
- [ ] Pricing.tsx - Cards de preço podem quebrar
- [ ] Leads.tsx - Tabela não responsiva
- [ ] LeadDetail.tsx - Layout pode quebrar
- [ ] Settings.tsx - Tabs podem não funcionar bem
- [ ] DashboardLayout.tsx - Sidebar em mobile

### 4.2 Breakpoints Inconsistentes
- [ ] Alguns usam `md:`, outros `lg:`, sem padrão
- [ ] Falta de `sm:` para mobile pequeno
- [ ] Containers sem max-width consistente

---

## 5. PROBLEMAS DE FUNCIONALIDADE

### 5.1 Autenticação
- [x] JWT implementado
- [x] Login funciona
- [ ] Refresh token não implementado
- [ ] Logout não limpa estado corretamente em todas as telas
- [ ] Proteção de rotas inconsistente

### 5.2 Stripe/Pagamentos
- [ ] Checkout dá erro "Falha ao criar sessão de checkout"
- [ ] Webhooks podem não estar configurados
- [ ] Falta página de gerenciamento de assinatura

### 5.3 Sentiment Analysis
- [x] Backend implementado
- [x] Componente LiveChatWithSentiment existe
- [ ] Não está integrado com conversas reais
- [ ] Falta dashboard de métricas de sentimento

---

## 6. ROTAS DO BACKEND vs FRONTEND

### 6.1 Rotas Backend Existentes
```
/api/trpc/auth.*
/api/trpc/leads.*
/api/trpc/billing.*
/api/trpc/checkout.*
/api/trpc/sentiment.*
/api/trpc/escalation.*
/api/trpc/notifications.*
```

### 6.2 Rotas Frontend que Precisam de Backend
- [ ] `/admin/*` - Não existe
- [ ] `/conversations` - Não existe
- [ ] `/automations` - Não existe

---

## 7. PLANO DE AÇÃO PRIORITÁRIO

### Fase 1: Correções Críticas (Hoje)
1. [ ] Padronizar TODAS as telas para tema DARK
2. [ ] Criar sistema de roles (Master vs Comprador)
3. [ ] Corrigir integração Stripe

### Fase 2: Telas Faltantes (Próximo)
1. [ ] Criar Dashboard do Comprador
2. [ ] Criar página de Conversas
3. [ ] Criar painel Admin básico

### Fase 3: Responsividade (Depois)
1. [ ] Auditar cada tela em mobile
2. [ ] Corrigir breakpoints
3. [ ] Testar em diferentes dispositivos

### Fase 4: Polish (Final)
1. [ ] Animações consistentes
2. [ ] Loading states padronizados
3. [ ] Error handling uniforme

---

## 8. DECISÕES DE DESIGN

### Paleta de Cores Oficial (DARK THEME)
```css
--background: slate-950 (#020617)
--card: slate-900 (#0f172a)
--card-hover: slate-800 (#1e293b)
--border: slate-800 (#1e293b)
--text-primary: white (#ffffff)
--text-secondary: slate-400 (#94a3b8)
--text-muted: slate-500 (#64748b)
--accent-primary: blue-500 (#3b82f6)
--accent-secondary: cyan-500 (#06b6d4)
--success: green-500 (#22c55e)
--warning: yellow-500 (#eab308)
--error: red-500 (#ef4444)
```

### Gradientes Padrão
```css
--gradient-bg: from-slate-950 via-slate-900 to-slate-950
--gradient-card: from-slate-900 to-slate-800
--gradient-accent: from-blue-500 to-cyan-500
```

---

## 9. ESTRUTURA DE ARQUIVOS PROPOSTA

```
client/src/
├── pages/
│   ├── public/           # Páginas públicas
│   │   ├── Landing.tsx
│   │   ├── Pricing.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ...
│   ├── customer/         # Páginas do Comprador
│   │   ├── Dashboard.tsx
│   │   ├── Leads.tsx
│   │   ├── Conversations.tsx
│   │   ├── Analytics.tsx
│   │   ├── Settings.tsx
│   │   └── Billing.tsx
│   └── admin/            # Páginas do Master
│       ├── AdminDashboard.tsx
│       ├── Users.tsx
│       ├── Subscriptions.tsx
│       ├── Support.tsx
│       └── SystemSettings.tsx
├── components/
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   ├── CustomerLayout.tsx
│   │   └── AdminLayout.tsx
│   └── ...
└── ...
```

---

## 10. CHECKLIST FINAL

- [ ] Todas as telas com tema DARK
- [ ] Separação Master/Comprador implementada
- [ ] Todas as rotas da sidebar funcionando
- [ ] Responsividade em todas as telas
- [ ] Stripe funcionando
- [ ] Sentiment Analysis integrado
- [ ] Testes de fluxo completo
- [ ] Commit no GitHub

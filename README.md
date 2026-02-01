# ChatLead Pro - WhatsApp AI Lead Generation

Uma plataforma SaaS completa para captura e gestão de leads imobiliários a partir de conversas do WhatsApp, com análise inteligente por IA.

## 🎯 Visão Geral

ChatLead Pro é um sistema inteligente de captura e qualificação de leads que funciona como um SDR (Sales Development Representative) virtual para corretores e imobiliárias. A plataforma:

- Captura conversas do WhatsApp Web através de uma extensão Chrome
- Analisa conversas automaticamente usando IA (OpenAI)
- Extrai informações estruturadas de leads (nome, telefone, objetivo, tipo de imóvel, bairro, orçamento, urgência)
- Gera respostas sugeridas profissionais
- Fornece um dashboard para gerenciar todos os leads capturados
- Controla quotas de uso através de planos de billing

## 🏗️ Arquitetura

```
Chrome Extension (extension/)     →  Front
        +
React SPA (client/)               →  Front  (Vite, dashboard, login, leads…)
        ↓
Express API + tRPC (server/)      →  Back   (rotas /api/*, OAuth, webhooks)
        ↓
OpenAI (Análise de IA) + PostgreSQL (Drizzle)
```

**Onde está o quê:** veja [ESTRUTURA.md](./ESTRUTURA.md) para um mapa claro de front vs back (pastas, builds, env).

## 📋 Stack Tecnológico

### Backend
- **Framework**: Express.js com tRPC
- **ORM**: Drizzle ORM
- **Banco de Dados**: PostgreSQL
- **IA**: OpenAI API
- **Autenticação**: Manus OAuth + API Keys

### Frontend
- **Framework**: React 19
- **Build**: Vite
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: Zustand + TanStack Query
- **Routing**: Wouter

### Testes
- **Framework**: Vitest
- **Cobertura**: Testes unitários e de integração

## 🚀 Funcionalidades

### 1. Sistema de Autenticação
- Autenticação via Manus OAuth
- API Keys individuais por usuário para acesso da extensão Chrome
- Geração automática de API Keys no primeiro login
- Regeneração de API Keys sob demanda

### 2. Análise de Conversas
- Endpoint POST `/api/analyze` para processar conversas
- Integração com OpenAI para análise inteligente
- Extração de dados estruturados:
  - Nome do cliente
  - Telefone e email
  - Objetivo (comprar/alugar/vender)
  - Tipo de imóvel
  - Bairro de interesse
  - Orçamento
  - Nível de urgência (frio/morno/quente)
  - Score de qualidade (0-1)
  - Resumo da conversa
  - Resposta sugerida

### 3. Gerenciamento de Leads
- Listagem de todos os leads capturados
- Filtros por urgência, status e busca
- Visualização detalhada de cada lead
- Cópia de respostas sugeridas
- Histórico de atividades

### 4. Sistema de Billing
- Planos com quotas mensais de leads e chamadas de API
- Integração com Stripe para pagamentos
- Rastreamento de uso em tempo real
- Validação de quotas antes de processar requisições
- Rate limiting para proteção da API

### 5. Dashboard Profissional
- Interface intuitiva e responsiva
- Sidebar com navegação
- Estatísticas de leads (total, quentes, mornos, frios)
- Tabela interativa com filtros
- Página de detalhes do lead
- Página de configurações

### 6. Configurações de Conta
- Gerenciamento de API Keys
- Informações de conta
- Visualização de plano ativo
- Rastreamento de uso mensal
- Informações de billing

## 📊 Schema do Banco de Dados

### Tabelas Principais

**users**
- ID, openId (único), email, nome
- apiKey (único) para autenticação
- role (user/admin)
- Informações de billing (stripeCustomerId, currentPlanId, subscriptionStatus)

**leads**
- ID, userId (FK), organizationId (FK)
- Informações do cliente (nome, telefone, email)
- Dados imobiliários (objetivo, tipo de imóvel, bairro, orçamento)
- Qualificação (urgência, score)
- Conteúdo gerado por IA (resumo, resposta sugerida)
- Status (new, contacted, qualified, lost, converted)

**subscriptions**
- ID, userId (FK), planId (FK)
- stripeSubscriptionId (único)
- Status e datas de período

**usageTracking**
- ID, userId (FK), month (YYYY-MM)
- leadsCreated, apiCallsMade
- Índice único em (userId, month)

**plans**
- ID, name, description
- stripePriceId (único)
- monthlyLeadsQuota, monthlyApiCalls
- priceInCents, currency

**organizations**
- ID, name, slug (único)
- Informações da imobiliária

**leadActivities**
- ID, leadId (FK), userId (FK)
- activityType, description
- Histórico de interações

**rateLimitLog**
- ID, apiKey, endpoint
- requestCount, windowStart, windowEnd
- Índice único em (apiKey, endpoint, windowStart)

## 🔐 Segurança

- **API Keys**: Validação obrigatória via header `Authorization: Bearer {apiKey}`
- **Rate Limiting**: Limite de requisições por minuto por API Key
- **Quotas**: Validação de quotas mensais antes de processar
- **CORS**: Restrito a domínios autorizados
- **JWT**: Sessões seguras com cookies HTTP-only
- **Sem Automação**: Nenhuma automação de envio de mensagens

## 📝 Endpoints da API

### Análise de Conversas
```
POST /api/analyze
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "conversation": "string (conversa do WhatsApp)",
  "contactName": "string (opcional)"
}

Response:
{
  "success": true,
  "data": {
    "name": "João Silva",
    "phone": "+55 11 99999-9999",
    "email": "joao@example.com",
    "objective": "buy",
    "propertyType": "Apartamento",
    "neighborhood": "Vila Mariana",
    "budget": "R$ 500.000 - R$ 700.000",
    "urgency": "hot",
    "score": 0.85,
    "summary": "Cliente interessado em comprar apartamento...",
    "suggestedResponse": "Olá João! Obrigado pelo interesse..."
  }
}
```

### Listar Leads
```
GET /api/trpc/leads.list?limit=50&offset=0
```

### Obter Detalhes do Lead
```
GET /api/trpc/leads.getById?id=1
```

### Verificar Quotas
```
GET /api/trpc/billing.checkQuotas?leadsToCreate=1&apiCallsToMake=1
```

## 🛠️ Instalação e Setup

### Pré-requisitos
- Node.js 22+
- PostgreSQL 14+
- OpenAI API Key
- Manus OAuth credentials

### Variáveis de Ambiente
```
DATABASE_URL=mysql://user:password@localhost:3306/chatlead_pro
JWT_SECRET=your-secret-key
VITE_APP_ID=manus-app-id
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
BUILT_IN_FORGE_API_KEY=forge-api-key
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
```

### Instalação
```bash
# Clonar repositório
git clone https://github.com/seu-usuario/chatlead-pro.git
cd chatlead-pro

# Instalar dependências
pnpm install

# Configurar banco de dados
pnpm db:push

# Iniciar servidor de desenvolvimento
pnpm dev
```

## 🧪 Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes com watch
pnpm test --watch

# Executar testes específicos
pnpm test server/routers/leads.test.ts
```

## 📦 Build para Produção

```bash
# Build
pnpm build

# Iniciar servidor
pnpm start
```

## 🎨 Estrutura de Pastas

```
chatlead-pro/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Leads, Settings, etc)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── lib/           # Utilitários (tRPC client)
│   │   ├── contexts/      # React contexts
│   │   └── App.tsx        # Roteamento principal
│   └── public/            # Arquivos estáticos
├── server/                 # Backend
│   ├── routers/           # tRPC routers (leads, billing)
│   ├── services/          # Serviços (aiAnalysis)
│   ├── middleware/        # Middlewares (apiKeyAuth)
│   ├── db.ts              # Funções de banco de dados
│   └── routers.ts         # Agregação de routers
├── drizzle/               # Schema e migrations
└── shared/                # Código compartilhado
```

## 🚀 Roadmap

### Sprint 1 ✅
- [x] Schema do banco de dados
- [x] Autenticação e API Keys
- [x] Análise de conversas com OpenAI

### Sprint 2 ✅
- [x] Dashboard de leads
- [x] Página de detalhes do lead
- [x] Página de configurações

### Sprint 3 (Próximo)
- [ ] Integração com Stripe
- [ ] Extensão Chrome MVP
- [ ] Webhook para sincronização

### Sprint 4 (Futuro)
- [ ] Suporte a organizações/imobiliárias
- [ ] Roles e permissões
- [ ] Relatórios e analytics
- [ ] Integração com CRM

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ para corretores e imobiliárias**

# back-plugin

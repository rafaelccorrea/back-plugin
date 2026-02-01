# Roadmap: Integração Completa de Análise de Sentimento no LiveChat

## 📋 Visão Geral

Este documento detalha os próximos passos para integrar completamente a Análise de Sentimento ao LiveChat do ChatLead Pro, transformando-o em um sistema inteligente de atendimento.

---

## 🎯 Fases de Implementação

### **FASE 1: Integração com API de Sentimento (1-2 dias)**

#### 1.1 Conectar Frontend ao Backend
**Arquivo:** `client/src/components/LiveChatWithSentiment.tsx`

```typescript
// Adicionar hook para chamar API de sentimento
const analyzeSentimentAPI = async (message: string) => {
  try {
    const response = await fetch('/api/sentiment/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return await response.json();
  } catch (error) {
    console.error('Erro ao analisar sentimento:', error);
  }
};
```

**Tarefas:**
- [ ] Criar hook `useSentimentAnalysis` com tRPC
- [ ] Integrar chamada de API ao enviar mensagem
- [ ] Armazenar resultado de sentimento em estado
- [ ] Exibir resultado em tempo real

#### 1.2 Persistência em Banco de Dados
**Arquivo:** `server/db.ts`

```typescript
// Adicionar funções para salvar análises
export async function saveSentimentAnalysis(data: InsertSentimentAnalysis) {
  return db.insert(sentimentAnalyses).values(data).returning();
}

export async function updateConversationSummary(conversationId: string) {
  // Calcular agregados e atualizar resumo
}
```

**Tarefas:**
- [ ] Criar função para salvar análise no DB
- [ ] Criar função para atualizar resumo de conversa
- [ ] Adicionar índices para performance
- [ ] Testar queries com dados reais

---

### **FASE 2: Escalação Inteligente (1-2 dias)**

#### 2.1 Sistema de Alertas para Atendentes
**Arquivo:** `server/services/sentimentAnalysis.ts`

```typescript
export async function checkAndCreateAlert(
  conversationId: string,
  sentiment: SentimentResult
) {
  if (sentiment.sentiment === 'negative' && sentiment.urgency === 'high') {
    // Criar alerta
    // Notificar atendente
    // Oferecer conexão ao usuário
  }
}
```

**Tarefas:**
- [ ] Criar lógica de detecção de alertas
- [ ] Implementar fila de alertas
- [ ] Notificar atendentes via WebSocket/SSE
- [ ] Adicionar dashboard de alertas para atendentes

#### 2.2 Roteamento Automático
**Arquivo:** `client/src/components/LiveChatWithSentiment.tsx`

```typescript
// Se sentimento negativo + urgência alta
if (sentiment.sentiment === 'negative' && sentiment.urgency === 'high') {
  // Conectar automaticamente com atendente
  // Mostrar fila de espera
  // Enviar contexto ao atendente
}
```

**Tarefas:**
- [ ] Implementar lógica de roteamento
- [ ] Criar fila de atendentes disponíveis
- [ ] Mostrar tempo estimado de espera
- [ ] Transferir contexto da conversa

---

### **FASE 3: Dashboard de Métricas (1-2 dias)**

#### 3.1 Página de Analytics de Sentimento
**Arquivo:** `client/src/pages/SentimentAnalytics.tsx`

```typescript
// Componentes necessários:
// - Gráfico de distribuição de sentimentos
// - Tendência ao longo do tempo
// - Top keywords positivos/negativos
// - Emoções mais frequentes
// - Taxa de satisfação
// - Tempo médio de resolução
```

**Tarefas:**
- [ ] Criar página de analytics
- [ ] Implementar gráficos com Recharts
- [ ] Adicionar filtros (data, conversa, atendente)
- [ ] Exportar relatórios em PDF/CSV

#### 3.2 Dashboard em Tempo Real para Atendentes
**Arquivo:** `client/src/pages/AtendenteDashboard.tsx`

```typescript
// Componentes:
// - Alertas ativos
// - Conversas pendentes
// - Score de satisfação por atendente
// - Histórico de conversas
// - Sugestões de resposta
```

**Tarefas:**
- [ ] Criar dashboard de atendente
- [ ] Implementar atualização em tempo real (WebSocket)
- [ ] Mostrar sugestões de resposta
- [ ] Adicionar histórico de conversas

---

### **FASE 4: IA Avançada com Claude (1-2 dias)**

#### 4.1 Análise de Sentimento com Claude 3.5
**Arquivo:** `server/services/sentimentAnalysis.ts`

```typescript
export async function analyzeSentimentWithClaude(message: string) {
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: SENTIMENT_PROMPT },
      { role: 'user', content: message }
    ],
    response_format: { type: 'json_schema', ... }
  });
  
  return parseResponse(response);
}
```

**Tarefas:**
- [ ] Integrar Claude 3.5 Sonnet
- [ ] Usar JSON Schema para resposta estruturada
- [ ] Adicionar fallback para análise simples
- [ ] Testar com 100+ mensagens reais

#### 4.2 Sugestões de Resposta Inteligentes
**Arquivo:** `server/services/sentimentAnalysis.ts`

```typescript
export async function generateSmartResponse(
  sentiment: SentimentResult,
  conversationHistory: Message[]
) {
  // Gerar resposta empática e contextualizada
  // Baseada em sentimento, histórico e tom
}
```

**Tarefas:**
- [ ] Criar prompt para geração de respostas
- [ ] Implementar contexto de conversa
- [ ] Validar qualidade de respostas
- [ ] Adicionar opção de editar antes de enviar

---

### **FASE 5: Integração com CRM (2-3 dias)**

#### 5.1 Sincronização com Salesforce/Pipedrive
**Arquivo:** `server/services/crmIntegration.ts`

```typescript
export async function syncSentimentToCRM(
  leadId: string,
  sentiment: SentimentResult
) {
  // Atualizar score de lead
  // Adicionar nota de sentimento
  // Atualizar status se necessário
}
```

**Tarefas:**
- [ ] Criar adaptadores para CRM (Salesforce, Pipedrive, HubSpot)
- [ ] Mapear campos de sentimento
- [ ] Implementar sincronização bidirecional
- [ ] Testar com dados reais

#### 5.2 Webhook para Eventos de Sentimento
**Arquivo:** `server/routers/sentiment.ts`

```typescript
// Disparar webhooks quando:
// - Sentimento muda de positivo para negativo
// - Urgência aumenta
// - Cliente conecta com atendente
```

**Tarefas:**
- [ ] Criar sistema de webhooks
- [ ] Documentar eventos disponíveis
- [ ] Adicionar retry logic
- [ ] Testar com múltiplos endpoints

---

### **FASE 6: Notificações e Automações (1-2 dias)**

#### 6.1 Sistema de Notificações
**Arquivo:** `server/services/notificationService.ts`

```typescript
export async function notifyAttendant(alert: SentimentAlert) {
  // Email
  // SMS
  // Push notification
  // In-app notification
}
```

**Tarefas:**
- [ ] Implementar notificações por email
- [ ] Adicionar notificações push
- [ ] Criar notificações in-app
- [ ] Configurar preferências de notificação

#### 6.2 Automações Baseadas em Sentimento
**Arquivo:** `server/services/automationService.ts`

```typescript
// Automações:
// - Enviar cupom se cliente positivo
// - Oferecer atendente se negativo
// - Escalar para gerente se muito negativo
// - Agendar follow-up baseado em sentimento
```

**Tarefas:**
- [ ] Criar engine de automações
- [ ] Implementar regras configuráveis
- [ ] Adicionar histórico de automações
- [ ] Testar com diferentes cenários

---

### **FASE 7: Machine Learning e Otimização (2-3 dias)**

#### 7.1 Treinar Modelo Customizado
**Arquivo:** `server/services/mlSentiment.ts`

```typescript
// Usar dados históricos para:
// - Treinar modelo customizado
// - Melhorar precisão
// - Adaptar a linguagem do cliente
// - Detectar padrões específicos
```

**Tarefas:**
- [ ] Coletar dados de treinamento
- [ ] Preparar dataset
- [ ] Treinar modelo com TensorFlow/PyTorch
- [ ] Avaliar performance
- [ ] Fazer deploy do modelo

#### 7.2 A/B Testing de Respostas
**Arquivo:** `server/services/abTesting.ts`

```typescript
// Testar diferentes respostas
// Medir taxa de satisfação
// Otimizar continuamente
```

**Tarefas:**
- [ ] Implementar framework de A/B testing
- [ ] Criar variações de respostas
- [ ] Medir métricas de sucesso
- [ ] Aplicar winning variation

---

## 📊 Cronograma Recomendado

| Fase | Duração | Prioridade | Status |
|------|---------|-----------|--------|
| 1: Integração com API | 1-2 dias | 🔴 Crítica | ⏳ Próxima |
| 2: Escalação Inteligente | 1-2 dias | 🔴 Crítica | ⏳ Próxima |
| 3: Dashboard de Métricas | 1-2 dias | 🟠 Alta | ⏳ Depois |
| 4: IA Avançada | 1-2 dias | 🟠 Alta | ⏳ Depois |
| 5: Integração CRM | 2-3 dias | 🟡 Média | ⏳ Depois |
| 6: Notificações | 1-2 dias | 🟡 Média | ⏳ Depois |
| 7: Machine Learning | 2-3 dias | 🟡 Média | ⏳ Depois |

**Total Estimado:** 9-16 dias para implementação completa

---

## 🚀 Próximo Passo Imediato: FASE 1

### Tarefas para Hoje:

1. **Criar hook tRPC para sentimento**
   ```typescript
   // client/src/hooks/useSentimentAnalysis.ts
   export const useSentimentAnalysis = () => {
     return trpc.sentiment.analyze.useMutation();
   };
   ```

2. **Integrar ao componente LiveChat**
   ```typescript
   const { mutate: analyzeSentiment } = useSentimentAnalysis();
   
   const handleSendMessage = async () => {
     const result = await analyzeSentiment({ message: input });
     // Usar resultado
   };
   ```

3. **Salvar no banco de dados**
   ```typescript
   // Chamar API para salvar análise
   await fetch('/api/sentiment/save', { ... });
   ```

4. **Testar fluxo completo**
   - Enviar mensagem
   - Analisar sentimento
   - Salvar no DB
   - Exibir resultado

---

## 📝 Checklist de Implementação

### FASE 1: Integração com API
- [ ] Criar hook `useSentimentAnalysis`
- [ ] Integrar tRPC ao componente
- [ ] Implementar chamada de API
- [ ] Armazenar resultado em estado
- [ ] Exibir sentimento em tempo real
- [ ] Salvar análise no DB
- [ ] Testar com 10+ mensagens
- [ ] Documentar API

### FASE 2: Escalação
- [ ] Criar sistema de alertas
- [ ] Implementar fila de atendentes
- [ ] Notificar atendentes
- [ ] Transferir contexto
- [ ] Testar roteamento

### FASE 3: Dashboard
- [ ] Criar página de analytics
- [ ] Implementar gráficos
- [ ] Adicionar filtros
- [ ] Exportar relatórios

### FASE 4: IA Avançada
- [ ] Integrar Claude 3.5
- [ ] Gerar respostas inteligentes
- [ ] Testar qualidade

### FASE 5: CRM
- [ ] Criar adaptadores
- [ ] Sincronizar dados
- [ ] Testar integrações

### FASE 6: Notificações
- [ ] Implementar email
- [ ] Adicionar push
- [ ] Criar in-app

### FASE 7: ML
- [ ] Coletar dados
- [ ] Treinar modelo
- [ ] Fazer deploy

---

## 🎓 Recursos Necessários

- **Frontend:** React, tRPC, Tailwind CSS
- **Backend:** Node.js, Express, tRPC
- **Database:** PostgreSQL (Drizzle ORM)
- **IA:** Claude 3.5 Sonnet API
- **CRM:** Salesforce/Pipedrive/HubSpot SDKs
- **Gráficos:** Recharts
- **Notificações:** Resend, Twilio

---

## 🔗 Referências

- [Documentação de Sentimento](./SENTIMENT_ANALYSIS_IMPLEMENTATION.md)
- [Exemplos de Uso](./SENTIMENT_ANALYSIS_EXAMPLES.md)
- [Arquitetura](./SENTIMENT_ARCHITECTURE_DIAGRAM.md)

---

**Última atualização:** 30 de Janeiro de 2026
**Próximo passo:** FASE 1 - Integração com API de Sentimento

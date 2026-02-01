# Análise de Sentimento - Exemplos Práticos

## 📝 Exemplos de Análise

### Exemplo 1: Cliente Positivo

**Mensagem do Cliente:**
```
"Adorei o produto! Chegou rápido e a qualidade é excelente. Muito obrigado!"
```

**Análise Retornada:**
```json
{
  "sentiment": "positive",
  "score": 0.92,
  "confidence": 0.98,
  "keywords": ["adorei", "rápido", "qualidade", "excelente", "obrigado"],
  "urgency": "low",
  "suggestedResponse": "Fico muito feliz em saber! Sua satisfação é nossa prioridade. Recomende-nos para seus amigos! 😊"
}
```

**Ação do Sistema:**
- ✅ Nenhum alerta
- ✅ Resposta automática pode ser enviada
- ✅ Registrar como cliente satisfeito
- ✅ Oportunidade de upsell

---

### Exemplo 2: Cliente Insatisfeito

**Mensagem do Cliente:**
```
"Péssimo atendimento! Esperei 3 horas e ninguém respondeu. Que decepção!"
```

**Análise Retornada:**
```json
{
  "sentiment": "negative",
  "score": 0.15,
  "confidence": 0.95,
  "keywords": ["péssimo", "atendimento", "esperei", "decepção"],
  "urgency": "high",
  "suggestedResponse": "Peço desculpas sinceras pela demora. Isso não deveria ter acontecido. Como posso resolver isso para você agora?"
}
```

**Ação do Sistema:**
- 🚨 Alerta visual em vermelho
- 🔔 Notificação push para atendente
- 👤 Escalação automática para atendente humano
- 📊 Registrar como cliente insatisfeito
- 🎯 Prioridade alta na fila

---

### Exemplo 3: Cliente Neutro/Dúvida

**Mensagem do Cliente:**
```
"Qual é o prazo de entrega para São Paulo?"
```

**Análise Retornada:**
```json
{
  "sentiment": "neutral",
  "score": 0.50,
  "confidence": 0.85,
  "keywords": ["prazo", "entrega"],
  "urgency": "medium",
  "suggestedResponse": "Ótima pergunta! Para São Paulo, o prazo é de 2-3 dias úteis. Posso ajudar com mais informações?"
}
```

**Ação do Sistema:**
- ℹ️ Sem alerta urgente
- 🤖 Bot pode responder
- 📋 Registrar como dúvida comum
- 💾 Usar para treinar modelo

---

## 🎯 Casos de Uso Reais

### Caso 1: Escalação Automática

```
TIMELINE:
├─ 14:30 - Cliente envia: "Não consegui fazer login"
│  └─ Sentimento: NEUTRAL (score: 0.50)
│  └─ Ação: Bot responde com passo-a-passo
│
├─ 14:35 - Cliente: "Tentei mas continua não funcionando 😞"
│  └─ Sentimento: NEGATIVE (score: 0.35)
│  └─ Ação: Alerta MEDIUM, oferecer atendente
│
└─ 14:40 - Cliente: "Que frustração! Perdi tempo demais!"
   └─ Sentimento: NEGATIVE (score: 0.10)
   └─ Ação: Alerta HIGH, escalação automática
   └─ Atendente: Carlos conectado
```

### Caso 2: Análise de Tendência

```
CONVERSA COM ANÁLISE DE TENDÊNCIA:

Mensagem 1: "Olá, tudo bem?" 
└─ Score: 0.60 (NEUTRAL)

Mensagem 2: "Gostaria de saber mais sobre os planos"
└─ Score: 0.65 (NEUTRAL → POSITIVO)

Mensagem 3: "Adorei! Parece ser exatamente o que procuro"
└─ Score: 0.85 (POSITIVO)

Mensagem 4: "Vou contratar agora mesmo!"
└─ Score: 0.95 (MUITO POSITIVO)

RESULTADO:
├─ Tendência: IMPROVING ↗️
├─ Satisfação Final: Muito Satisfeito
└─ Ação: Enviar confirmação + oferecer onboarding
```

### Caso 3: Detecção de Problema Crítico

```
ANÁLISE DE MÚLTIPLAS MENSAGENS:

Cliente A: "Produto chegou quebrado"
└─ Urgência: HIGH, Sentimento: NEGATIVE

Cliente B: "Meu pedido não chegou"
└─ Urgência: HIGH, Sentimento: NEGATIVE

Cliente C: "Tive o mesmo problema"
└─ Urgência: HIGH, Sentimento: NEGATIVE

SISTEMA DETECTA:
├─ Padrão: 3+ clientes com mesmo problema
├─ Ação: Alertar gerente de operações
├─ Recomendação: Investigar logística
└─ Escalação: Criar ticket para equipe técnica
```

---

## 📊 Dashboard de Sentimentos

### Visualização em Tempo Real

```
┌─────────────────────────────────────────────────┐
│         DASHBOARD DE SENTIMENTOS                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  Satisfação Geral: 78% ↗️ (Melhorando)          │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Distribuição de Sentimentos              │  │
│  │                                          │  │
│  │ Positivo:  ████████░ 65%                │  │
│  │ Neutro:    ███░░░░░░ 20%                │  │
│  │ Negativo:  ██░░░░░░░ 15%                │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  Alertas Pendentes: 3 🔴                        │
│  ├─ Cliente insatisfeito (Alta)                │
│  ├─ Problema de entrega (Alta)                 │
│  └─ Dúvida não respondida (Média)              │
│                                                  │
│  Tempo Médio de Resposta:                       │
│  ├─ Sentimento Positivo: 2min                  │
│  ├─ Sentimento Neutro: 5min                    │
│  └─ Sentimento Negativo: 1min 30s ⚡           │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🎓 Treinamento de Atendentes

### Sugestões Baseadas em Sentimento

**Quando Sentimento = NEGATIVE:**

```
SUGESTÕES PARA ATENDENTE:
├─ ✅ Comece com empatia: "Entendo sua frustração..."
├─ ✅ Reconheça o problema: "Você tem razão em estar insatisfeito..."
├─ ✅ Ofereça solução: "Aqui está o que podemos fazer..."
├─ ✅ Acompanhe: "Vou garantir que isso seja resolvido..."
│
└─ ❌ EVITE:
   ├─ Ser defensivo
   ├─ Ignorar o problema
   ├─ Fazer promessas vazias
   └─ Responder com demora
```

**Quando Sentimento = POSITIVE:**

```
SUGESTÕES PARA ATENDENTE:
├─ ✅ Reforce a satisfação: "Fico feliz em saber!"
├─ ✅ Ofereça mais valor: "Posso mostrar outras funcionalidades?"
├─ ✅ Peça referências: "Você recomendaria para colegas?"
├─ ✅ Construa relacionamento: "Vamos manter contato!"
│
└─ ❌ EVITE:
   ├─ Parecer desinteressado
   ├─ Vender demais
   ├─ Interromper a satisfação
   └─ Deixar sem próximos passos
```

---

## 📈 Métricas Importantes

### KPIs de Sentimento

```
MÉTRICA                          META        ATUAL       STATUS
─────────────────────────────────────────────────────────────
Taxa de Satisfação               > 80%       78%         ⚠️
Clientes Muito Satisfeitos       > 60%       65%         ✅
Clientes Insatisfeitos           < 15%       15%         ⚠️
Tempo Resposta (Negativo)        < 2min      1:30s       ✅
Escalação Automática Correta     > 90%       88%         ⚠️
Tendência de Melhoria            Positiva    Positiva    ✅
```

---

## 🔄 Feedback Loop

### Melhorar o Modelo

```
1. COLETA DE DADOS
   └─ Armazenar análises de sentimento
   └─ Registrar feedback do atendente
   └─ Rastrear resultado final (converteu/não)

2. VALIDAÇÃO
   └─ Atendente confirma se análise estava correta
   └─ Registrar discrepâncias
   └─ Coletar dados de treinamento

3. RETRAINAMENTO
   └─ Usar dados coletados para melhorar modelo
   └─ Aumentar acurácia da análise
   └─ Reduzir falsos positivos/negativos

4. DEPLOY
   └─ Atualizar modelo em produção
   └─ Monitorar performance
   └─ Voltar ao passo 1
```

---

## 🛠️ Implementação Passo a Passo

### Fase 1: Setup Básico (Semana 1)
- [ ] Criar serviço de análise de sentimento
- [ ] Implementar rota de API
- [ ] Criar schema do banco de dados
- [ ] Integrar com LiveChat básico

### Fase 2: UI e Alertas (Semana 2)
- [ ] Adicionar indicadores visuais
- [ ] Implementar alertas
- [ ] Criar dashboard simples
- [ ] Testar com usuários reais

### Fase 3: Otimização (Semana 3)
- [ ] Melhorar acurácia do modelo
- [ ] Adicionar mais idiomas
- [ ] Implementar feedback loop
- [ ] Criar relatórios detalhados

---

## 🚀 Próximas Integrações

```
Análise de Sentimento
        ↓
    ┌───┴────┬─────────┬──────────┐
    ↓        ↓         ↓          ↓
  CRM    Email      SMS      Notificações
 Sync   Marketing  Alert      Push
    ↓        ↓         ↓          ↓
 Salesforce Brevo  Twilio    Firebase
```

---

**Documento Versão**: 1.0
**Última Atualização**: 30 de Janeiro de 2026
**Status**: Pronto para Implementação

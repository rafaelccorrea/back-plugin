# Análise de Sentimento em Tempo Real - Documentação Técnica

## 📋 Visão Geral

A **Análise de Sentimento em Tempo Real** é um sistema que detecta automaticamente o sentimento (positivo, negativo, neutro) do cliente durante conversas no LiveChat, permitindo que atendentes humanos respondam de forma mais empática e apropriada.

## 🎯 Objetivos

1. **Detecção Automática**: Analisar cada mensagem do cliente em tempo real
2. **Alertas Inteligentes**: Notificar atendentes sobre clientes insatisfeitos
3. **Sugestões Contextuais**: Recomendar respostas baseadas no sentimento
4. **Histórico de Sentimentos**: Rastrear mudanças de sentimento ao longo da conversa
5. **Métricas de Satisfação**: Gerar relatórios de satisfação do cliente

## 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (LiveChat)                       │
├─────────────────────────────────────────────────────────────┤
│  - Interface de Chat                                         │
│  - Exibição de Indicadores de Sentimento                     │
│  - Sugestões de Respostas                                    │
│  - Alertas Visuais                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              WebSocket / Real-time Events                    │
├─────────────────────────────────────────────────────────────┤
│  - Transmissão de mensagens                                  │
│  - Atualização de sentimentos                                │
│  - Notificações push                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Node.js/Express)                   │
├─────────────────────────────────────────────────────────────┤
│  - Roteamento de mensagens                                   │
│  - Orquestração de análise                                   │
│  - Persistência de dados                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Sentiment Analysis Service (IA/ML)                   │
├─────────────────────────────────────────────────────────────┤
│  Opção 1: API Externa (Google Cloud NLP, AWS Comprehend)    │
│  Opção 2: Modelo Local (Transformers, TextBlob)             │
│  Opção 3: Hybrid (Cache local + API para casos complexos)   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────┤
│  - Mensagens com sentimento                                  │
│  - Histórico de sentimentos                                  │
│  - Métricas agregadas                                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Implementação Técnica

### 1. Serviço de Análise de Sentimento

**Arquivo: `server/services/sentimentAnalysis.ts`**

```typescript
import { Anthropic } from "@anthropic-ai/sdk";

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number; // 0 a 1
  confidence: number; // 0 a 1
  keywords: string[];
  suggestedResponse: string;
  urgency: "low" | "medium" | "high";
}

class SentimentAnalysisService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async analyzeSentiment(message: string): Promise<SentimentResult> {
    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Analise o sentimento da seguinte mensagem em português e retorne um JSON com:
- sentiment: "positive", "negative" ou "neutral"
- score: número de 0 a 1 (1 = muito positivo, 0 = muito negativo)
- confidence: confiança da análise (0 a 1)
- keywords: array de palavras-chave que indicam o sentimento
- urgency: "low", "medium" ou "high" baseado na urgência de resposta
- suggestedResponse: uma sugestão breve de como responder

Mensagem: "${message}"

Retorne APENAS o JSON, sem explicações adicionais.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Resposta inesperada da API");
      }

      const result = JSON.parse(content.text);
      return result as SentimentResult;
    } catch (error) {
      console.error("Erro ao analisar sentimento:", error);
      // Fallback para análise simples
      return this.simpleAnalysis(message);
    }
  }

  private simpleAnalysis(message: string): SentimentResult {
    const positiveKeywords = [
      "ótimo",
      "excelente",
      "adorei",
      "perfeito",
      "muito bom",
      "obrigado",
      "agradeço",
    ];
    const negativeKeywords = [
      "péssimo",
      "horrível",
      "não gostei",
      "ruim",
      "problema",
      "erro",
      "frustrado",
      "insatisfeito",
    ];

    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveKeywords.filter((k) =>
      lowerMessage.includes(k)
    ).length;
    const negativeCount = negativeKeywords.filter((k) =>
      lowerMessage.includes(k)
    ).length;

    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    let score = 0.5;
    let urgency: "low" | "medium" | "high" = "low";

    if (negativeCount > positiveCount) {
      sentiment = "negative";
      score = Math.max(0.1, 0.5 - negativeCount * 0.15);
      urgency = negativeCount > 2 ? "high" : "medium";
    } else if (positiveCount > negativeCount) {
      sentiment = "positive";
      score = Math.min(0.9, 0.5 + positiveCount * 0.15);
      urgency = "low";
    }

    return {
      sentiment,
      score,
      confidence: 0.6,
      keywords: [
        ...positiveKeywords.filter((k) => lowerMessage.includes(k)),
        ...negativeKeywords.filter((k) => lowerMessage.includes(k)),
      ],
      suggestedResponse:
        sentiment === "negative"
          ? "Peço desculpas pela situação. Como posso ajudar a resolver?"
          : sentiment === "positive"
            ? "Fico feliz em ajudar! Há mais algo que você gostaria de saber?"
            : "Como posso ajudá-lo?",
      urgency,
    };
  }
}

export const sentimentService = new SentimentAnalysisService();
```

### 2. Rota de API para Análise de Sentimento

**Arquivo: `server/routes/sentiment.ts`**

```typescript
import express from "express";
import { sentimentService } from "../services/sentimentAnalysis";
import { db } from "../db";

const router = express.Router();

// Analisar sentimento de uma mensagem
router.post("/analyze", async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    const result = await sentimentService.analyzeSentiment(message);

    // Salvar análise no banco de dados
    if (conversationId) {
      await db.insert("sentiment_analyses").values({
        conversationId,
        message,
        sentiment: result.sentiment,
        score: result.score,
        confidence: result.confidence,
        keywords: result.keywords,
        urgency: result.urgency,
        createdAt: new Date(),
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Erro ao analisar sentimento:", error);
    res.status(500).json({ error: "Erro ao analisar sentimento" });
  }
});

// Obter histórico de sentimentos de uma conversa
router.get("/conversation/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const analyses = await db
      .select()
      .from("sentiment_analyses")
      .where("conversationId", "=", conversationId)
      .orderBy("createdAt", "desc");

    res.json(analyses);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

// Obter resumo de sentimentos (agregado)
router.get("/summary/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const analyses = await db
      .select()
      .from("sentiment_analyses")
      .where("conversationId", "=", conversationId);

    const summary = {
      totalMessages: analyses.length,
      positiveCount: analyses.filter((a) => a.sentiment === "positive").length,
      negativeCount: analyses.filter((a) => a.sentiment === "negative").length,
      neutralCount: analyses.filter((a) => a.sentiment === "neutral").length,
      averageScore:
        analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length || 0,
      sentimentTrend: calculateTrend(analyses),
      overallSatisfaction: calculateSatisfaction(analyses),
    };

    res.json(summary);
  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    res.status(500).json({ error: "Erro ao gerar resumo" });
  }
});

function calculateTrend(
  analyses: any[]
): "improving" | "declining" | "stable" {
  if (analyses.length < 2) return "stable";

  const firstHalf = analyses.slice(0, Math.ceil(analyses.length / 2));
  const secondHalf = analyses.slice(Math.ceil(analyses.length / 2));

  const firstAvg =
    firstHalf.reduce((sum, a) => sum + a.score, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, a) => sum + a.score, 0) / secondHalf.length;

  if (secondAvg > firstAvg + 0.1) return "improving";
  if (secondAvg < firstAvg - 0.1) return "declining";
  return "stable";
}

function calculateSatisfaction(analyses: any[]): string {
  const avgScore =
    analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length || 0;

  if (avgScore >= 0.7) return "Muito Satisfeito";
  if (avgScore >= 0.5) return "Satisfeito";
  if (avgScore >= 0.3) return "Neutro";
  return "Insatisfeito";
}

export default router;
```

### 3. Componente LiveChat Melhorado com Sentimento

**Arquivo: `client/src/components/LiveChatWithSentiment.tsx`**

```typescript
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  User,
  Bot,
  Phone,
  Clock,
  AlertCircle,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "bot" | "human";
  content: string;
  timestamp: Date;
  sender?: string;
  sentiment?: {
    sentiment: "positive" | "negative" | "neutral";
    score: number;
    confidence: number;
    urgency: "low" | "medium" | "high";
    suggestedResponse: string;
  };
}

type ChatMode = "closed" | "bot" | "human";

export default function LiveChatWithSentiment() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("bot");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Olá! 👋 Bem-vindo ao ChatLead Pro. Como posso ajudá-lo hoje?",
      timestamp: new Date(),
      sender: "Bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForHuman, setWaitingForHuman] = useState(false);
  const [sentimentSummary, setSentimentSummary] = useState<any>(null);
  const [showSentimentAlert, setShowSentimentAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeSentiment = async (userMessage: string) => {
    try {
      const response = await fetch("/api/sentiment/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: "current-chat",
        }),
      });

      if (!response.ok) throw new Error("Erro ao analisar sentimento");

      const sentiment = await response.json();
      return sentiment;
    } catch (error) {
      console.error("Erro:", error);
      return null;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <Smile className="w-4 h-4 text-green-400" />;
      case "negative":
        return <Frown className="w-4 h-4 text-red-400" />;
      default:
        return <Meh className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/20 border-green-500/30 text-green-300";
      case "negative":
        return "bg-red-500/20 border-red-500/30 text-red-300";
      default:
        return "bg-yellow-500/20 border-yellow-500/30 text-yellow-300";
    }
  };

  const botResponses: Record<string, string> = {
    preco: "Nossos planos começam em $29/mês para o Starter. Temos também planos Professional ($99/mês) e Enterprise (customizado). Quer saber mais detalhes?",
    features:
      "ChatLead Pro oferece: análise de conversas em tempo real, extração de dados estruturados, qualificação automática de leads, integração com WhatsApp, dashboard completo e muito mais!",
    integracao:
      "Sim! ChatLead Pro se integra perfeitamente com WhatsApp Business API. O setup leva apenas 5 minutos.",
    suporte:
      "Oferecemos suporte por email para todos os planos. Planos Professional e Enterprise têm suporte prioritário 24/7.",
    gratis:
      "Sim! O plano gratuito é permanente e inclui análise de até 100 conversas por mês. Sem cartão de crédito necessário.",
    default:
      "Entendi sua pergunta. Para uma resposta mais detalhada, gostaria de conectá-lo com um atendente humano? Clique em 'Falar com Atendente'.",
  };

  const getBotResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    if (
      lower.includes("preco") ||
      lower.includes("preço") ||
      lower.includes("custa") ||
      lower.includes("valor")
    ) {
      return botResponses.preco;
    }
    if (
      lower.includes("feature") ||
      lower.includes("funcionalidade") ||
      lower.includes("o que")
    ) {
      return botResponses.features;
    }
    if (lower.includes("integra") || lower.includes("whatsapp")) {
      return botResponses.integracao;
    }
    if (lower.includes("suporte") || lower.includes("ajuda")) {
      return botResponses.suporte;
    }
    if (lower.includes("gratis") || lower.includes("gratuito")) {
      return botResponses.gratis;
    }

    return botResponses.default;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Analisar sentimento da mensagem do usuário
    const sentiment = await analyzeSentiment(input);

    if (sentiment) {
      userMessage.sentiment = sentiment;

      // Se sentimento negativo, mostrar alerta
      if (sentiment.sentiment === "negative" && sentiment.urgency === "high") {
        setShowSentimentAlert(true);
        setTimeout(() => setShowSentimentAlert(false), 5000);
      }
    }

    // Simular delay de resposta do bot
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: sentiment?.suggestedResponse || getBotResponse(input),
        timestamp: new Date(),
        sender: "Bot",
      };
      setMessages((prev) => [...prev, botResponse]);
      setLoading(false);
    }, 800);
  };

  const handleConnectHuman = () => {
    setMode("human");
    setWaitingForHuman(true);

    const systemMessage: Message = {
      id: Date.now().toString(),
      type: "bot",
      content:
        "Conectando você com um atendente... Por favor, aguarde. Tempo médio de espera: 2 minutos.",
      timestamp: new Date(),
      sender: "Sistema",
    };

    setMessages((prev) => [...prev, systemMessage]);

    setTimeout(() => {
      setWaitingForHuman(false);
      const humanMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "human",
        content:
          "Olá! Meu nome é Carlos. Como posso ajudá-lo com o ChatLead Pro?",
        timestamp: new Date(),
        sender: "Carlos - Atendente",
      };
      setMessages((prev) => [...prev, humanMessage]);
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-2xl shadow-blue-500/50 flex items-center justify-center transition-all transform hover:scale-110 z-40 group"
      >
        <MessageCircle className="w-8 h-8 group-hover:animate-bounce" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] bg-slate-800/95 border-slate-700/50 shadow-2xl shadow-blue-500/20 flex flex-col z-40 backdrop-blur-xl">
      {/* Alert de Sentimento Negativo */}
      {showSentimentAlert && (
        <div className="bg-red-500/20 border-b border-red-500/30 p-3 flex items-center gap-2 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Cliente insatisfeito detectado. Responda com empatia!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <div>
            <h3 className="text-white font-bold">ChatLead Pro</h3>
            <p className="text-xs text-blue-100">
              {mode === "bot" ? "Bot de IA" : "Atendente Disponível"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 p-1 rounded transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-2 max-w-xs ${
                msg.type === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.type === "user"
                    ? "bg-blue-600"
                    : msg.type === "bot"
                      ? "bg-cyan-600"
                      : "bg-purple-600"
                }`}
              >
                {msg.type === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : msg.type === "bot" ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <Phone className="w-4 h-4 text-white" />
                )}
              </div>

              <div className="flex flex-col">
                <p className="text-xs text-slate-400 mb-1">{msg.sender}</p>

                {/* Indicador de Sentimento */}
                {msg.sentiment && msg.type === "user" && (
                  <div
                    className={`flex items-center gap-1 mb-1 px-2 py-1 rounded text-xs border ${getSentimentColor(msg.sentiment.sentiment)}`}
                  >
                    {getSentimentIcon(msg.sentiment.sentiment)}
                    <span className="capitalize">{msg.sentiment.sentiment}</span>
                    <span className="opacity-70">
                      ({Math.round(msg.sentiment.score * 100)}%)
                    </span>
                  </div>
                )}

                <div
                  className={`px-4 py-2 rounded-lg ${
                    msg.type === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-700 text-slate-100 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>

                <p className="text-xs text-slate-500 mt-1">
                  {msg.timestamp.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-700 px-4 py-2 rounded-lg rounded-bl-none">
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
              </div>
            </div>
          </div>
        )}

        {waitingForHuman && (
          <div className="flex justify-center">
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
              <Clock className="w-3 h-3 mr-1" />
              Conectando com atendente...
            </Badge>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sentimento Summary */}
      {sentimentSummary && mode === "human" && (
        <div className="px-4 py-2 bg-slate-700/50 border-t border-slate-700/50 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span>Satisfação do Cliente:</span>
            <div className="flex items-center gap-1">
              {sentimentSummary.sentimentTrend === "improving" && (
                <TrendingUp className="w-3 h-3 text-green-400" />
              )}
              {sentimentSummary.sentimentTrend === "declining" && (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className="font-semibold">
                {sentimentSummary.overallSatisfaction}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {mode === "bot" && !waitingForHuman && (
        <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-800/50">
          <Button
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
            onClick={handleConnectHuman}
          >
            <Phone className="w-3 h-3 mr-1" />
            Falar com Atendente
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 text-sm"
            disabled={loading || waitingForHuman}
          />
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

### 4. Schema do Banco de Dados

**Arquivo: `server/db/migrations/sentiment_analysis.sql`**

```sql
-- Tabela para armazenar análises de sentimento
CREATE TABLE sentiment_analyses (
  id SERIAL PRIMARY KEY,
  conversationId VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sentiment VARCHAR(20) NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  score DECIMAL(3, 2) NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_conversation_id (conversationId),
  INDEX idx_sentiment (sentiment),
  INDEX idx_urgency (urgency)
);

-- Tabela para armazenar resumos de conversas
CREATE TABLE conversation_summaries (
  id SERIAL PRIMARY KEY,
  conversationId VARCHAR(255) NOT NULL UNIQUE,
  totalMessages INT DEFAULT 0,
  positiveCount INT DEFAULT 0,
  negativeCount INT DEFAULT 0,
  neutralCount INT DEFAULT 0,
  averageScore DECIMAL(3, 2) DEFAULT 0,
  sentimentTrend VARCHAR(20) CHECK (sentimentTrend IN ('improving', 'declining', 'stable')),
  overallSatisfaction VARCHAR(50),
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Tabela para alertas de sentimento
CREATE TABLE sentiment_alerts (
  id SERIAL PRIMARY KEY,
  conversationId VARCHAR(255) NOT NULL,
  messageId VARCHAR(255) NOT NULL,
  sentiment VARCHAR(20) NOT NULL,
  urgency VARCHAR(20) NOT NULL,
  alertSent BOOLEAN DEFAULT FALSE,
  resolvedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
);
```

## 📊 Fluxo de Dados

```
1. Usuário envia mensagem
   ↓
2. Mensagem é recebida no backend
   ↓
3. Serviço de Sentimento analisa a mensagem
   ↓
4. Resultado é salvo no banco de dados
   ↓
5. WebSocket emite evento de sentimento
   ↓
6. Frontend recebe e atualiza UI
   ↓
7. Se sentimento negativo → Alerta visual
   ↓
8. Atendente vê indicador e responde com empatia
```

## 🎨 Indicadores Visuais

### Cores de Sentimento:
- **Positivo**: Verde (#10B981) - Ícone Smile
- **Negativo**: Vermelho (#EF4444) - Ícone Frown
- **Neutro**: Amarelo (#F59E0B) - Ícone Meh

### Indicadores de Urgência:
- **Alta**: Borda vermelha + ícone de alerta
- **Média**: Borda laranja + ícone de atenção
- **Baixa**: Sem destaque especial

## 🔔 Notificações

```typescript
// Exemplo de notificação para atendente
{
  type: "SENTIMENT_ALERT",
  severity: "high",
  message: "Cliente insatisfeito detectado",
  sentiment: "negative",
  score: 0.2,
  conversationId: "conv_123",
  timestamp: "2026-01-30T15:30:00Z"
}
```

## 📈 Métricas e Relatórios

### Dashboard de Sentimentos:
- Gráfico de tendência de sentimento ao longo do tempo
- Distribuição de sentimentos (pizza chart)
- Taxa de satisfação média
- Tempo médio de resposta por sentimento
- Palavras-chave mais frequentes

## 🚀 Benefícios

1. **Atendimento Proativo**: Identificar clientes insatisfeitos imediatamente
2. **Respostas Empáticas**: Sugestões de resposta baseadas em sentimento
3. **Qualidade de Serviço**: Rastrear satisfação ao longo do tempo
4. **Treinamento**: Dados para treinar atendentes
5. **Automação Inteligente**: Escalar para atendente quando necessário

## 🔐 Considerações de Privacidade

- Dados de sentimento são armazenados com segurança
- Conformidade com LGPD/GDPR
- Opção de não armazenar análises sensíveis
- Criptografia end-to-end opcional

## 📚 Próximos Passos

1. Integrar com serviço de IA mais avançado (Claude, GPT-4)
2. Adicionar análise de emoções específicas (raiva, frustração, alegria)
3. Implementar feedback loop para melhorar modelo
4. Criar dashboard de analytics detalhado
5. Adicionar suporte para múltiplos idiomas

---

**Status**: Pronto para implementação
**Complexidade**: Média
**Tempo Estimado**: 2-3 semanas
**Dependências**: Node.js, PostgreSQL, Anthropic API

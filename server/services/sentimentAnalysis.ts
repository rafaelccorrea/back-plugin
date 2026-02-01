import { invokeLLM } from "../_core/llm";

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number; // 0 a 1
  confidence: number; // 0 a 1
  keywords: string[];
  suggestedResponse: string;
  urgency: "low" | "medium" | "high";
  emotions?: string[]; // emoções detectadas
  tone?: "friendly" | "frustrated" | "neutral" | "excited";
}

const SENTIMENT_PROMPT = `Você é um especialista em análise de sentimento e emoções em conversas.

Analise a seguinte mensagem em português e retorne um JSON com:
1. **sentiment**: "positive", "negative" ou "neutral"
2. **score**: número de 0 a 1 (1 = muito positivo, 0 = muito negativo, 0.5 = neutro)
3. **confidence**: confiança da análise (0 a 1)
4. **keywords**: array de palavras-chave que indicam o sentimento
5. **urgency**: "low", "medium" ou "high" baseado na urgência de resposta
   - LOW: Cliente satisfeito, sem pressa
   - MEDIUM: Cliente neutro ou com dúvida
   - HIGH: Cliente insatisfeito ou com problema urgente
6. **emotions**: array de emoções detectadas (ex: ["frustração", "entusiasmo"])
7. **tone**: tom da mensagem ("friendly", "frustrated", "neutral", "excited")
8. **suggestedResponse**: uma sugestão breve de como responder (máximo 2 frases)

Regras importantes:
- Detecte frustração, raiva, satisfação, entusiasmo
- Considere contexto e sarcasmo
- Se houver múltiplas emoções, liste todas
- Resposta sugerida deve ser empática e profissional
- Retorne APENAS o JSON válido, sem explicações adicionais`;

export class SentimentAnalysisService {
  async analyzeSentiment(message: string): Promise<SentimentResult> {
    try {
      const userMessage = `Analise esta mensagem:
"${message}"

Retorne um JSON com a análise de sentimento.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: SENTIMENT_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "sentiment_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                sentiment: {
                  type: "string",
                  enum: ["positive", "negative", "neutral"],
                  description: "Sentimento detectado",
                },
                score: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Score de sentimento",
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Confiança da análise",
                },
                keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "Palavras-chave indicadoras",
                },
                urgency: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Nível de urgência",
                },
                emotions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Emoções detectadas",
                },
                tone: {
                  type: "string",
                  enum: ["friendly", "frustrated", "neutral", "excited"],
                  description: "Tom da mensagem",
                },
                suggestedResponse: {
                  type: "string",
                  description: "Resposta sugerida",
                },
              },
              required: [
                "sentiment",
                "score",
                "confidence",
                "keywords",
                "urgency",
                "suggestedResponse",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const contentStr = typeof content === "string" ? content : JSON.stringify(content);
      const parsed = JSON.parse(contentStr);

      return {
        sentiment: parsed.sentiment || "neutral",
        score: parsed.score ?? 0.5,
        confidence: parsed.confidence ?? 0.8,
        keywords: parsed.keywords || [],
        urgency: parsed.urgency || "low",
        suggestedResponse: parsed.suggestedResponse || this.getDefaultResponse(parsed.sentiment),
        emotions: parsed.emotions || [],
        tone: parsed.tone || "neutral",
      };
    } catch (error) {
      console.error("[Sentiment Analysis] Error:", error);
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
      "maravilhoso",
      "incrível",
      "fantástico",
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
      "decepção",
      "raiva",
      "nunca",
      "pior",
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
    let tone: "friendly" | "frustrated" | "neutral" | "excited" = "neutral";
    const emotions: string[] = [];

    if (negativeCount > positiveCount) {
      sentiment = "negative";
      score = Math.max(0.1, 0.5 - negativeCount * 0.15);
      urgency = negativeCount > 2 ? "high" : "medium";
      tone = "frustrated";
      emotions.push("frustração", "insatisfação");
    } else if (positiveCount > negativeCount) {
      sentiment = "positive";
      score = Math.min(0.9, 0.5 + positiveCount * 0.15);
      urgency = "low";
      tone = positiveCount > 2 ? "excited" : "friendly";
      emotions.push("satisfação", "entusiasmo");
    }

    return {
      sentiment,
      score,
      confidence: 0.6,
      keywords: [
        ...positiveKeywords.filter((k) => lowerMessage.includes(k)),
        ...negativeKeywords.filter((k) => lowerMessage.includes(k)),
      ],
      urgency,
      suggestedResponse: this.getDefaultResponse(sentiment),
      emotions,
      tone,
    };
  }

  private getDefaultResponse(sentiment: string): string {
    switch (sentiment) {
      case "positive":
        return "Fico feliz em saber! Há mais algo que eu possa ajudar? 😊";
      case "negative":
        return "Peço desculpas pela situação. Como posso ajudar a resolver? Vou conectá-lo com um atendente.";
      default:
        return "Obrigado pela sua pergunta. Como posso ajudá-lo?";
    }
  }
}

export const sentimentService = new SentimentAnalysisService();

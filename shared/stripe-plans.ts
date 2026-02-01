/**
 * Configuração dos planos do WA-SDR no Stripe
 * Estes IDs foram criados via MCP Stripe
 */

export const STRIPE_PLANS = {
  FREE: {
    id: "free",
    name: "Gratis",
    description: "Perfeito para começar",
    priceId: null,
    monthlyLeadsQuota: 10,
    monthlyApiCalls: 100,
    features: [
      "Até 10 leads por mês",
      "100 chamadas de API",
      "Dashboard básico",
      "Suporte por email",
    ],
  },
  STARTER: {
    id: "starter",
    name: "Starter",
    description: "Para pequenos corretores",
    priceId: "price_1Sv9E4Fu6ngAE0TnTInADMKf", // $29/mês
    productId: "prod_Tsv4N8H8en1Mom",
    monthlyLeadsQuota: 50,
    monthlyApiCalls: 1000,
    price: 2900, // em centavos
    currency: "usd",
    features: [
      "Até 50 leads por mês",
      "1.000 chamadas de API",
      "Dashboard completo",
      "Respostas sugeridas por IA",
      "Suporte por email",
    ],
  },
  PROFESSIONAL: {
    id: "professional",
    name: "Professional",
    description: "Para imobiliárias em crescimento",
    priceId: "price_1Sv9ECFu6ngAE0TnxiJdxvie", // $79/mês
    productId: "prod_Tsv45lm0rl5wZb",
    monthlyLeadsQuota: 500,
    monthlyApiCalls: 10000,
    price: 7900, // em centavos
    currency: "usd",
    features: [
      "Até 500 leads por mês",
      "10.000 chamadas de API",
      "Dashboard completo",
      "Respostas sugeridas por IA",
      "Prioridade de suporte",
      "Relatórios avançados",
      "API documentation",
    ],
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    description: "Para grandes operações",
    priceId: "price_1Sv9ELFu6ngAE0Tn6v8rpMt4", // $199/mês
    productId: "prod_Tsv4vDJ06AKT8L",
    monthlyLeadsQuota: 999999, // ilimitado
    monthlyApiCalls: 50000,
    price: 19900, // em centavos
    currency: "usd",
    features: [
      "Leads ilimitados",
      "50.000 chamadas de API",
      "Dashboard completo",
      "Respostas sugeridas por IA",
      "Suporte dedicado 24/7",
      "Relatórios avançados",
      "API documentation",
      "Integração customizada",
      "SLA garantido",
    ],
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

export function getPlanById(planId: string) {
  return STRIPE_PLANS[planId as PlanId];
}

export function getPlanByPriceId(priceId: string) {
  return Object.values(STRIPE_PLANS).find((plan) => plan.priceId === priceId);
}

export function getAllPlans() {
  return Object.values(STRIPE_PLANS);
}

export function getPaidPlans() {
  return Object.values(STRIPE_PLANS).filter((plan) => plan.priceId !== null);
}

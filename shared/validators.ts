import { z } from "zod";

/**
 * Validadores reutilizáveis para toda a aplicação
 * Garante validação consistente em backend e frontend
 */

// ============================================================================
// Validadores de Usuário
// ============================================================================

export const userEmailValidator = z
  .string()
  .email("Email inválido")
  .max(320, "Email muito longo")
  .toLowerCase();

export const userNameValidator = z
  .string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome muito longo")
  .trim();

export const apiKeyValidator = z
  .string()
  .min(32, "API Key inválida")
  .max(256, "API Key inválida")
  .regex(/^[a-zA-Z0-9_-]+$/, "API Key contém caracteres inválidos");

// ============================================================================
// Validadores de Lead
// ============================================================================

export const leadNameValidator = z
  .string()
  .min(2, "Nome do lead deve ter pelo menos 2 caracteres")
  .max(100, "Nome muito longo")
  .trim();

export const leadPhoneValidator = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{8,}$/, "Telefone inválido")
  .max(20, "Telefone muito longo");

export const leadEmailValidator = z
  .string()
  .email("Email inválido")
  .max(320, "Email muito longo")
  .optional()
  .or(z.literal(""));

export const leadObjectiveValidator = z.enum(["comprar", "vender", "alugar", "arrendar", "consulta"]);

export const propertyTypeValidator = z.enum(["apartamento", "casa", "terreno", "comercial", "outro"]);

export const neighborhoodValidator = z
  .string()
  .min(2, "Bairro inválido")
  .max(100, "Bairro muito longo")
  .trim();

export const budgetValidator = z
  .number()
  .positive("Orçamento deve ser positivo")
  .max(999999999, "Orçamento muito alto")
  .optional();

export const urgencyValidator = z.enum(["baixa", "média", "alta"]);

export const conversationValidator = z
  .object({
    contact: z.string().min(1, "Contato inválido"),
    messages: z
      .array(
        z.object({
          sender: z.enum(["user", "contact"]),
          text: z.string().min(1, "Mensagem vazia"),
          timestamp: z.string().optional(),
        })
      )
      .min(1, "Conversa vazia"),
    timestamp: z.string().datetime().optional(),
  });

export const analyzeLeadInputValidator = z.object({
  conversation: conversationValidator,
});

export const createLeadInputValidator = z.object({
  name: leadNameValidator,
  phone: leadPhoneValidator,
  email: leadEmailValidator,
  objective: leadObjectiveValidator,
  propertyType: propertyTypeValidator,
  neighborhood: neighborhoodValidator,
  budget: budgetValidator,
  urgency: urgencyValidator,
  conversationId: z.string().optional(),
  notes: z.string().max(1000, "Notas muito longas").optional(),
});

export const updateLeadInputValidator = z.object({
  name: leadNameValidator.optional(),
  phone: leadPhoneValidator.optional(),
  email: leadEmailValidator.optional(),
  objective: leadObjectiveValidator.optional(),
  propertyType: propertyTypeValidator.optional(),
  neighborhood: neighborhoodValidator.optional(),
  budget: budgetValidator.optional(),
  urgency: urgencyValidator.optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(["novo", "contatado", "qualificado", "descartado"]).optional(),
});

// ============================================================================
// Validadores de Checkout
// ============================================================================

export const checkoutSessionInputValidator = z.object({
  priceId: z.string().min(1, "ID de preço inválido"),
  successUrl: z.string().url("URL de sucesso inválida").optional(),
  cancelUrl: z.string().url("URL de cancelamento inválida").optional(),
});

// ============================================================================
// Validadores de Organização
// ============================================================================

export const organizationNameValidator = z
  .string()
  .min(2, "Nome da organização deve ter pelo menos 2 caracteres")
  .max(100, "Nome muito longo");

export const organizationSlugValidator = z
  .string()
  .min(2, "Slug muito curto")
  .max(50, "Slug muito longo")
  .regex(/^[a-z0-9-]+$/, "Slug contém caracteres inválidos");

export const createOrganizationInputValidator = z.object({
  name: organizationNameValidator,
  slug: organizationSlugValidator.optional(),
});

// ============================================================================
// Validadores de Paginação
// ============================================================================

export const paginationValidator = z.object({
  page: z.number().int().min(1, "Página deve ser positiva").default(1),
  limit: z
    .number()
    .int()
    .min(1, "Limite deve ser positivo")
    .max(100, "Limite máximo é 100")
    .default(10),
  search: z.string().max(100, "Busca muito longa").optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// Validadores de Data
// ============================================================================

export const dateRangeValidator = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// Tipos Inferidos
// ============================================================================

export type AnalyzeLeadInput = z.infer<typeof analyzeLeadInputValidator>;
export type CreateLeadInput = z.infer<typeof createLeadInputValidator>;
export type UpdateLeadInput = z.infer<typeof updateLeadInputValidator>;
export type CheckoutSessionInput = z.infer<typeof checkoutSessionInputValidator>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputValidator>;
export type PaginationInput = z.infer<typeof paginationValidator>;
export type DateRangeInput = z.infer<typeof dateRangeValidator>;

import { getDb } from "../db";
import { leads, appointments, openClawAutomations } from "../../drizzle/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * AI Security Proxy
 * Esta classe garante que a IA opere dentro dos limites de segurança e integridade de dados.
 */
export class AISecurityProxy {
  private userId: number;

  constructor(userId: number) {
    this.userId = userId;
  }

  private async getDb() {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db;
  }

  /**
   * Busca leads do usuário logado.
   */
  async getLeads(limit = 5) {
    const db = await this.getDb();
    return await db.select({
      id: leads.id,
      name: leads.name,
      status: leads.status,
      phone: leads.phone,
      email: leads.email,
      createdAt: leads.createdAt
    })
    .from(leads)
    .where(eq(leads.userId, this.userId))
    .orderBy(desc(leads.createdAt))
    .limit(Math.min(limit, 20));
  }

  /**
   * CRIAÇÃO DE LEAD: Validação Rigorosa.
   * Campos Obrigatórios: name, phone, email.
   */
  async createLead(data: { name: string; phone: string; email: string; status?: string }) {
    if (!data.name || !data.phone || !data.email) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Para criar um lead, você deve fornecer Nome, Telefone e E-mail obrigatoriamente." 
      });
    }

    const db = await this.getDb();
    console.info(`[AI ACTION] Creating lead: ${data.name}`);

    const [inserted] = await db.insert(leads).values({
      userId: this.userId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      status: (data.status as any) || "new",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning({ id: leads.id });

    return inserted;
  }

  /**
   * CRIAÇÃO DE AGENDAMENTO: Validação Rigorosa.
   * Campos Obrigatórios: leadId, title, startTime.
   */
  async createAppointment(data: { leadId: number; title: string; type: string; startTime: Date; description?: string }) {
    if (!data.leadId || !data.title || !data.startTime) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Dados incompletos para agendamento. Lead, Título e Data/Hora são obrigatórios." 
      });
    }

    const db = await this.getDb();
    
    const [lead] = await db.select().from(leads)
      .where(and(eq(leads.id, data.leadId), eq(leads.userId, this.userId)))
      .limit(1);

    if (!lead) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado ao lead ou lead inexistente." });
    }

    return await db.insert(appointments).values({
      userId: this.userId,
      leadId: data.leadId,
      title: data.title,
      type: data.type || "visit",
      startTime: data.startTime,
      description: `[IA] ${data.description || ""}`,
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * ATUALIZAÇÃO DE STATUS: Validação Rigorosa.
   * Campos Obrigatórios: leadId, newStatus.
   */
  async updateLeadStatus(leadId: number, newStatus: string) {
    if (!leadId || !newStatus) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "ID do lead e novo status são obrigatórios." });
    }

    const db = await this.getDb();
    
    const [existing] = await db.select().from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, this.userId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Lead não encontrado." });
    }

    const validStatus = ["new", "contacted", "qualified", "lost", "converted"];
    if (!validStatus.includes(newStatus)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Status inválido." });
    }

    return await db.update(leads)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(leads.id, leadId));
  }

  /**
   * CRIAÇÃO DE AUTOMAÇÃO: Validação Rigorosa.
   * Campos Obrigatórios: name, triggerEvent, actionType.
   */
  async createAutomation(data: { name: string; triggerEvent: string; actionType: string; executionMode: "automatic" | "manual_approval"; minScore: string; description?: string }) {
    if (!data.name || !data.triggerEvent || !data.actionType) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nome, Gatilho e Ação são obrigatórios para criar uma automação." });
    }

    const db = await this.getDb();
    
    return await db.insert(openClawAutomations).values({
      userId: this.userId,
      name: data.name,
      triggerEvent: data.triggerEvent,
      actionType: data.actionType,
      executionMode: data.executionMode || "manual_approval",
      minScore: data.minScore || "0.00",
      description: data.description,
      actionConfig: "{}",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getAppointments(limit = 5) {
    const db = await this.getDb();
    return await db.select({
      id: appointments.id,
      title: appointments.title,
      startTime: appointments.startTime,
      type: appointments.type,
      status: appointments.status
    })
    .from(appointments)
    .where(and(
      eq(appointments.userId, this.userId),
      gte(appointments.startTime, new Date())
    ))
    .orderBy(appointments.startTime)
    .limit(Math.min(limit, 20));
  }

  async getAutomations() {
    const db = await this.getDb();
    return await db.select()
      .from(openClawAutomations)
      .where(eq(openClawAutomations.userId, this.userId));
  }

  async sendWhatsAppMessage(leadId: number, message: string) {
    if (!leadId || !message) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Lead e mensagem são obrigatórios." });
    }

    const db = await this.getDb();
    const [lead] = await db.select().from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, this.userId)))
      .limit(1);

    if (!lead || !lead.phone) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Lead sem telefone cadastrado." });
    }

    return {
      phone: lead.phone,
      message: message,
      whatsappUrl: `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    };
  }
}

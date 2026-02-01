import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { appointments, leads } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { dispatchOutgoingWebhook } from "../services/outgoingWebhookService";

export const appointmentsRouter = router({
  create: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      type: z.string().default("visit"),
      startTime: z.string(),
      endTime: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [appointment] = await db.insert(appointments).values({
        userId: ctx.user.id,
        leadId: input.leadId,
        title: input.title,
        description: input.description,
        type: input.type,
        startTime: new Date(input.startTime),
        endTime: input.endTime ? new Date(input.endTime) : null,
      }).returning();

      if (appointment) {
        const [leadRow] = await db.select({ name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, input.leadId)).limit(1);
        void dispatchOutgoingWebhook(ctx.user.id, "appointment.created", {
          appointmentId: appointment.id,
          leadId: appointment.leadId,
          title: appointment.title,
          description: appointment.description ?? null,
          type: appointment.type ?? "visit",
          startTime: appointment.startTime instanceof Date ? appointment.startTime.toISOString() : String(appointment.startTime),
          endTime: appointment.endTime ? (appointment.endTime instanceof Date ? appointment.endTime.toISOString() : String(appointment.endTime)) : null,
          status: appointment.status ?? "scheduled",
          leadName: leadRow?.name ?? null,
          leadPhone: leadRow?.phone ?? null,
        });
      }

      return { success: true, data: appointment };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      startTime: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (input.title) updateData.title = input.title;
      if (input.description) updateData.description = input.description;
      if (input.type) updateData.type = input.type;
      if (input.startTime) updateData.startTime = new Date(input.startTime);
      if (input.status) updateData.status = input.status;

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [appointment] = await db.update(appointments)
        .set(updateData)
        .where(and(
          eq(appointments.id, input.id),
          eq(appointments.userId, ctx.user.id)
        ))
        .returning();

      if (appointment) {
        const [leadRow] = await db.select({ name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, appointment.leadId)).limit(1);
        void dispatchOutgoingWebhook(ctx.user.id, "appointment.updated", {
          appointmentId: appointment.id,
          leadId: appointment.leadId,
          title: appointment.title,
          description: appointment.description ?? null,
          type: appointment.type ?? "visit",
          startTime: appointment.startTime instanceof Date ? appointment.startTime.toISOString() : String(appointment.startTime),
          endTime: appointment.endTime ? (appointment.endTime instanceof Date ? appointment.endTime.toISOString() : String(appointment.endTime)) : null,
          status: appointment.status ?? "scheduled",
          leadName: leadRow?.name ?? null,
          leadPhone: leadRow?.phone ?? null,
        });
      }

      return { success: true, data: appointment };
    }),

  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      let conditions = [eq(appointments.userId, ctx.user.id)];
      
      if (input.from) {
        conditions.push(gte(appointments.startTime, new Date(input.from)));
      }
      if (input.to) {
        conditions.push(lte(appointments.startTime, new Date(input.to)));
      }

      const items = await db.select({
        appointment: appointments,
        lead: {
          id: leads.id,
          name: leads.name,
          phone: leads.phone
        }
      })
      .from(appointments)
      .leftJoin(leads, eq(appointments.leadId, leads.id))
      .where(and(...conditions))
      .limit(input.limit)
      .offset(input.offset)
      .orderBy(desc(appointments.startTime));

      return { data: items };
    }),

  getUpcoming: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const items = await db.select({
        appointment: appointments,
        lead: {
          id: leads.id,
          name: leads.name,
        }
      })
      .from(appointments)
      .leftJoin(leads, eq(appointments.leadId, leads.id))
      .where(and(
        eq(appointments.userId, ctx.user.id),
        gte(appointments.startTime, now),
        lte(appointments.startTime, next24h),
        eq(appointments.status, "scheduled")
      ))
      .orderBy(appointments.startTime);

      return { data: items };
    }),
});

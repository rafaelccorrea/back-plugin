import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, getUserByApiKey, ensurePreAttendanceTables } from "../db";
import { preAttendanceEvents, pendingWhatsAppMessages } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sanitizeObject } from "../middleware/security";

const eventTypeEnum = z.enum([
  "conversation_read",
  "lead_captured",
  "ai_reply_sent",
  "manual_reply_sent",
]);

const reportEventSchema = z.object({
  apiKey: z.string().min(1),
  eventType: eventTypeEnum,
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  leadId: z.number().optional(),
  messageText: z.string().optional(),
  conversationSnippet: z.string().optional(),
});

export const preAttendanceRouter = router({
  /** Lista eventos de pré-atendimento do usuário (dashboard). */
  listEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(),
        contactPhone: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        const conditions = [eq(preAttendanceEvents.userId, ctx.user.id)];
        if (input.contactPhone) {
          conditions.push(eq(preAttendanceEvents.contactPhone, input.contactPhone));
        }

        const rows = await db
          .select()
          .from(preAttendanceEvents)
          .where(conditions.length > 1 ? and(...conditions) : conditions[0])
          .orderBy(desc(preAttendanceEvents.createdAt))
          .limit(input.limit + 1);

        const nextCursor = rows.length > input.limit ? rows[rows.length - 1]?.id : undefined;
        const items = rows.slice(0, input.limit);

        return {
          items,
          nextCursor,
        };
      } catch (err: unknown) {
        const e = err as Error & { code?: string; cause?: Error };
        const code = e?.code ?? (e?.cause as { code?: string })?.code;
        const msg = (e?.message ?? "") + ((e?.cause as Error)?.message ?? "");
        const isMissingTable =
          code === "42P01" ||
          /relation ".*" does not exist/i.test(msg) ||
          /does not exist/i.test(msg) ||
          (e?.message?.includes("Failed query") && /preAttendanceEvents/.test(e?.message ?? ""));
        if (isMissingTable) {
          await ensurePreAttendanceTables();
          const conditions = [eq(preAttendanceEvents.userId, ctx.user.id)];
          if (input.contactPhone) conditions.push(eq(preAttendanceEvents.contactPhone, input.contactPhone));
          const rows = await db
            .select()
            .from(preAttendanceEvents)
            .where(conditions.length > 1 ? and(...conditions) : conditions[0])
            .orderBy(desc(preAttendanceEvents.createdAt))
            .limit(input.limit + 1);
          const items = rows.slice(0, input.limit);
          const nextCursor = rows.length > input.limit ? rows[rows.length - 1]?.id : undefined;
          return { items, nextCursor };
        }
        throw err;
      }
    }),

  /** Extensão reporta um evento (conversation_read, lead_captured, ai_reply_sent, manual_reply_sent). */
  reportEvent: publicProcedure
    .input(reportEventSchema)
    .mutation(async ({ input }) => {
      const sanitized = sanitizeObject(input);
      const user = await getUserByApiKey(sanitized.apiKey);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid API Key" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.insert(preAttendanceEvents).values({
        userId: user.id,
        eventType: sanitized.eventType,
        contactName: sanitized.contactName ?? null,
        contactPhone: sanitized.contactPhone ?? null,
        leadId: sanitized.leadId ?? null,
        messageText: sanitized.messageText ?? null,
        conversationSnippet: sanitized.conversationSnippet ?? null,
      });

      return { success: true };
    }),

  /** Lista mensagens pendentes do usuário (dashboard). */
  listPending: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    try {
      const rows = await db
        .select()
        .from(pendingWhatsAppMessages)
        .where(eq(pendingWhatsAppMessages.userId, ctx.user.id))
        .orderBy(desc(pendingWhatsAppMessages.createdAt));

      return { items: rows };
    } catch (err: unknown) {
      const e = err as Error & { code?: string; cause?: Error };
      const code = e?.code ?? (e?.cause as { code?: string })?.code;
      const msg = (e?.message ?? "") + ((e?.cause as Error)?.message ?? "");
      const isMissingTable =
        code === "42P01" ||
        /relation ".*" does not exist/i.test(msg) ||
        /does not exist/i.test(msg) ||
        (e?.message?.includes("Failed query") && /pendingWhatsAppMessages/.test(e?.message ?? ""));
      if (isMissingTable) {
        await ensurePreAttendanceTables();
        const rows = await db
          .select()
          .from(pendingWhatsAppMessages)
          .where(eq(pendingWhatsAppMessages.userId, ctx.user.id))
          .orderBy(desc(pendingWhatsAppMessages.createdAt));
        return { items: rows };
      }
      throw err;
    }
  }),

  /** Enfileira uma mensagem para enviar ao contato (upsert por userId + contactPhone). */
  enqueueMessage: protectedProcedure
    .input(
      z.object({
        contactPhone: z.string().min(1),
        messageText: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const normalizedPhone = input.contactPhone.replace(/\D/g, "").slice(-16);

      try {
        // SELECT + UPDATE ou INSERT (não depende de UNIQUE constraint)
        const [existing] = await db
          .select({ id: pendingWhatsAppMessages.id })
          .from(pendingWhatsAppMessages)
          .where(
            and(
              eq(pendingWhatsAppMessages.userId, ctx.user.id),
              eq(pendingWhatsAppMessages.contactPhone, normalizedPhone)
            )
          )
          .limit(1);

        if (existing) {
          await db
            .update(pendingWhatsAppMessages)
            .set({ messageText: input.messageText, createdAt: new Date() })
            .where(eq(pendingWhatsAppMessages.id, existing.id));
        } else {
          await db.insert(pendingWhatsAppMessages).values({
            userId: ctx.user.id,
            contactPhone: normalizedPhone,
            messageText: input.messageText,
          });
        }

        return { success: true };
      } catch (err: unknown) {
        const e = err as Error & { code?: string; cause?: Error };
        const code = e?.code ?? (e?.cause as { code?: string })?.code;
        const msg = (e?.message ?? "") + ((e?.cause as Error)?.message ?? "");
        const isMissingTable =
          code === "42P01" ||
          /relation ".*" does not exist/i.test(msg) ||
          /does not exist/i.test(msg) ||
          (e?.message?.includes("Failed query") && /pendingWhatsAppMessages/.test(e?.message ?? ""));
        if (isMissingTable) {
          try {
            await ensurePreAttendanceTables();
            // Repete a operação após criar as tabelas
            const [existing] = await db
              .select({ id: pendingWhatsAppMessages.id })
              .from(pendingWhatsAppMessages)
              .where(
                and(
                  eq(pendingWhatsAppMessages.userId, ctx.user.id),
                  eq(pendingWhatsAppMessages.contactPhone, normalizedPhone)
                )
              )
              .limit(1);
            if (existing) {
              await db
                .update(pendingWhatsAppMessages)
                .set({ messageText: input.messageText, createdAt: new Date() })
                .where(eq(pendingWhatsAppMessages.id, existing.id));
            } else {
              await db.insert(pendingWhatsAppMessages).values({
                userId: ctx.user.id,
                contactPhone: normalizedPhone,
                messageText: input.messageText,
              });
            }
            return { success: true };
          } catch (initErr) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "As tabelas de pré-atendimento não puderam ser criadas. Rode no backend: pnpm db:migrate",
              cause: initErr,
            });
          }
        }
        throw err;
      }
    }),

  /** Extensão obtém e consome a mensagem pendente para o contato (retorna e remove). */
  getAndConsumePending: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        contactPhone: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const user = await getUserByApiKey(input.apiKey);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid API Key" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const normalizedPhone = input.contactPhone.replace(/\D/g, "").slice(-16);

      const [row] = await db
        .select()
        .from(pendingWhatsAppMessages)
        .where(
          and(
            eq(pendingWhatsAppMessages.userId, user.id),
            eq(pendingWhatsAppMessages.contactPhone, normalizedPhone)
          )
        )
        .limit(1);

      if (!row) {
        return { message: null };
      }

      await db
        .delete(pendingWhatsAppMessages)
        .where(eq(pendingWhatsAppMessages.id, row.id));

      return { message: row.messageText };
    }),

  /** Remove uma mensagem pendente (dashboard). */
  removePending: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .delete(pendingWhatsAppMessages)
        .where(
          and(
            eq(pendingWhatsAppMessages.id, input.id),
            eq(pendingWhatsAppMessages.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});

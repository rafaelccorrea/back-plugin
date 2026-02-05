-- Enum para tipos de evento do pré-atendimento
CREATE TYPE "pre_attendance_event_type" AS ENUM (
  'conversation_read',
  'lead_captured',
  'ai_reply_sent',
  'manual_reply_sent'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preAttendanceEvents" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "eventType" "pre_attendance_event_type" NOT NULL,
  "contactName" varchar(255),
  "contactPhone" varchar(32),
  "leadId" integer,
  "messageText" text,
  "conversationSnippet" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_attendance_user_idx" ON "preAttendanceEvents" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_attendance_created_idx" ON "preAttendanceEvents" ("createdAt");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pendingWhatsAppMessages" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "contactPhone" varchar(32) NOT NULL,
  "messageText" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_whatsapp_user_phone" ON "pendingWhatsAppMessages" ("userId", "contactPhone");

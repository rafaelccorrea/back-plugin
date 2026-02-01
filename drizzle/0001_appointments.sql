-- Appointments table (agendamentos) - snake_case para compatibilidade com 0000
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lead_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) DEFAULT 'visit',
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"status" varchar(50) DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_user_idx" ON "appointments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_lead_idx" ON "appointments" USING btree ("lead_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_start_time_idx" ON "appointments" USING btree ("start_time");

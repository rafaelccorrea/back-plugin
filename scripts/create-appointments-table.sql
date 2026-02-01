-- Execute este SQL no Supabase: SQL Editor (Dashboard > SQL Editor > New query)
-- Cria a tabela appointments em snake_case (compatível com o schema do Drizzle)

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

CREATE INDEX IF NOT EXISTS "appointment_user_idx" ON "appointments" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "appointment_lead_idx" ON "appointments" USING btree ("lead_id");
CREATE INDEX IF NOT EXISTS "appointment_start_time_idx" ON "appointments" USING btree ("start_time");

-- Opcional: FK para leads (se quiser integridade referencial)
-- ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id");

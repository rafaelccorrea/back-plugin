-- Tabela webhooks (saída) – colunas em snake_case
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"url" varchar(2048) NOT NULL,
	"events" text NOT NULL,
	"secret" varchar(128),
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"failure_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

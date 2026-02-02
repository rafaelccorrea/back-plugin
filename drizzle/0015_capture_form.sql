-- Formulário público de captura: token no link + personalização white-label
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "captureToken" varchar(64) UNIQUE;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "captureFormSettings" text;

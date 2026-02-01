-- Plano e status de assinatura vêm apenas da tabela subscriptions
ALTER TABLE "users" DROP COLUMN IF EXISTS "plan";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "subscription_status";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "subscriptionStatus";

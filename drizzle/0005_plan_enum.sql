-- Criar enum de planos
CREATE TYPE "plan" AS ENUM ('free', 'starter', 'professional', 'enterprise');
--> statement-breakpoint
-- Adicionar coluna plan_type na tabela plans
ALTER TABLE "plans" ADD COLUMN "plan_type" "plan" DEFAULT 'free' NOT NULL;
--> statement-breakpoint
-- Preencher plan_type conforme stripe_price_id (STRIPE_PLANS)
UPDATE "plans" SET "plan_type" = 'starter' WHERE "stripe_price_id" = 'price_1Sv9E4Fu6ngAE0TnTInADMKf';
--> statement-breakpoint
UPDATE "plans" SET "plan_type" = 'professional' WHERE "stripe_price_id" = 'price_1Sv9ECFu6ngAE0TnxiJdxvie';
--> statement-breakpoint
UPDATE "plans" SET "plan_type" = 'enterprise' WHERE "stripe_price_id" = 'price_1Sv9ELFu6ngAE0Tn6v8rpMt4';
--> statement-breakpoint
-- Adicionar coluna plan na tabela users
ALTER TABLE "users" ADD COLUMN "plan" "plan" DEFAULT 'free' NOT NULL;
--> statement-breakpoint
-- Migrar dados: users.plan a partir de plans.plan_type onde current_plan_id = plans.id
UPDATE "users" SET "plan" = COALESCE((SELECT "plan_type" FROM "plans" WHERE "plans"."id" = "users"."current_plan_id"), 'free') WHERE "current_plan_id" IS NOT NULL;
--> statement-breakpoint
-- Remover coluna antiga
ALTER TABLE "users" DROP COLUMN "current_plan_id";

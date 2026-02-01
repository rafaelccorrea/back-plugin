CREATE TYPE "public"."activity_type" AS ENUM('created', 'contacted', 'response_sent', 'status_changed', 'note_added', 'call_logged');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'lost', 'converted');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('new_lead', 'quota_warning', 'quota_exceeded', 'payment_failed', 'subscription_updated', 'lead_status_changed', 'system_alert');--> statement-breakpoint
CREATE TYPE "public"."objective" AS ENUM('buy', 'rent', 'sell', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('member', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('cold', 'warm', 'hot');--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"name" varchar(255),
	"phone" varchar(20),
	"email" varchar(320),
	"objective" "objective",
	"property_type" varchar(255),
	"neighborhood" varchar(255),
	"budget" varchar(255),
	"urgency" "urgency" DEFAULT 'cold',
	"score" numeric(3, 2) DEFAULT '0.00',
	"summary" text,
	"suggested_response" text,
	"raw_conversation" text,
	"status" "lead_status" DEFAULT 'new',
	"source" varchar(255) DEFAULT 'whatsapp_extension',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data" text,
	"is_read" boolean DEFAULT false,
	"is_pushed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo" text,
	"website" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"stripe_price_id" varchar(255) NOT NULL,
	"monthly_leads_quota" integer NOT NULL,
	"monthly_api_calls" integer NOT NULL,
	"price_in_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"features" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" varchar(2048) NOT NULL,
	"auth" varchar(255) NOT NULL,
	"p256dh" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key" varchar(128) NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"request_count" integer DEFAULT 1,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"status" "subscription_status" DEFAULT 'active',
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"month" varchar(7) NOT NULL,
	"leads_created" integer DEFAULT 0,
	"api_calls_made" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64),
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"password_hash" varchar(255),
	"email_verified" boolean DEFAULT false,
	"email_verification_token" varchar(255),
	"email_verification_expires" timestamp,
	"password_reset_token" varchar(255),
	"password_reset_expires" timestamp,
	"google_id" varchar(255),
	"api_key" varchar(128),
	"organization_id" integer,
	"organization_role" "organization_role" DEFAULT 'member',
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"current_plan_id" integer,
	"subscription_status" "subscription_status",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE INDEX "activity_lead_idx" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "lead_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lead_user_idx" ON "leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lead_organization_idx" ON "leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lead_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "push_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "apikey_endpoint_idx" ON "rate_limit_log" USING btree ("api_key","endpoint","window_start");--> statement-breakpoint
CREATE INDEX "subscription_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_subscription_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_month_idx" ON "usage_tracking" USING btree ("user_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_idx" ON "users" USING btree ("api_key");--> statement-breakpoint
CREATE INDEX "organization_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "google_id_idx" ON "users" USING btree ("google_id");
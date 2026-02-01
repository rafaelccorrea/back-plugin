-- Renomeia colunas de appointments de camelCase para snake_case (se a tabela foi criada com 0001 em camelCase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'userId') THEN
    ALTER TABLE "appointments" RENAME COLUMN "userId" TO "user_id";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'leadId') THEN
    ALTER TABLE "appointments" RENAME COLUMN "leadId" TO "lead_id";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'startTime') THEN
    ALTER TABLE "appointments" RENAME COLUMN "startTime" TO "start_time";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'endTime') THEN
    ALTER TABLE "appointments" RENAME COLUMN "endTime" TO "end_time";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'createdAt') THEN
    ALTER TABLE "appointments" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'updatedAt') THEN
    ALTER TABLE "appointments" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

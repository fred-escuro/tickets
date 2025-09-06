-- Remove legacy department column from users table
ALTER TABLE "public"."users"
  DROP COLUMN IF EXISTS "department";



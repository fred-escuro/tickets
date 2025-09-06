-- Add email verification columns to users table
ALTER TABLE "public"."users"
  ADD COLUMN "emailVerificationToken" TEXT,
  ADD COLUMN "emailVerificationExpires" TIMESTAMP(3);



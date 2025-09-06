-- AlterTable: Add auth and recovery columns to users table
ALTER TABLE "public"."users"
  ADD COLUMN "passwordResetToken" TEXT,
  ADD COLUMN "passwordResetExpires" TIMESTAMP(3),
  ADD COLUMN "oauthProvider" TEXT,
  ADD COLUMN "oauthProviderId" TEXT,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);



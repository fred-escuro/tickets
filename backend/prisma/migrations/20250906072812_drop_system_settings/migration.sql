/*
  Warnings:

  - The `type` column on the `app_settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'FILE');

-- AlterTable
ALTER TABLE "app_settings" DROP COLUMN "type",
ADD COLUMN     "type" "SettingType" NOT NULL DEFAULT 'JSON';

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL DEFAULT 'TicketHub',
    "appLogoUrl" TEXT,
    "companyName" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "businessHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- RenameIndex
ALTER INDEX "setting_history_ns_key_idx" RENAME TO "setting_history_namespace_key_idx";

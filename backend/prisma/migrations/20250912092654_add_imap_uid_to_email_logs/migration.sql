-- AlterEnum
ALTER TYPE "EmailMessageType" ADD VALUE 'FOLLOWUP';

-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "imapUid" INTEGER;

-- CreateIndex
CREATE INDEX "email_logs_imapUid_idx" ON "email_logs"("imapUid");

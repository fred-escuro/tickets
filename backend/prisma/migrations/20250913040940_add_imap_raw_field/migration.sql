-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "imap_raw" TEXT,
ADD COLUMN     "threadId" TEXT;

-- CreateIndex
CREATE INDEX "email_logs_threadId_idx" ON "email_logs"("threadId");

-- CreateIndex
CREATE INDEX "email_logs_inReplyTo_idx" ON "email_logs"("inReplyTo");

-- CreateIndex
CREATE INDEX "email_logs_references_idx" ON "email_logs"("references");

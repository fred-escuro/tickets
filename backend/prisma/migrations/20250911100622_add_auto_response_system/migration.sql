-- CreateEnum
CREATE TYPE "AutoResponseStatus" AS ENUM ('SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'PROCESSING', 'ERROR');

-- CreateEnum
CREATE TYPE "FollowupStatus" AS ENUM ('PROCESSED', 'FAILED', 'PENDING', 'IGNORED');

-- CreateTable
CREATE TABLE "auto_response_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subjectTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "triggerConditions" JSONB,
    "departmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_response_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_responses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "threadId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AutoResponseStatus" NOT NULL DEFAULT 'SENT',

    CONSTRAINT "auto_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_followups" (
    "id" TEXT NOT NULL,
    "autoResponseId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "originalEmailId" TEXT,
    "followupEmailId" TEXT,
    "content" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FollowupStatus" NOT NULL DEFAULT 'PROCESSED',

    CONSTRAINT "email_followups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_response_templates_departmentId_idx" ON "auto_response_templates"("departmentId");

-- CreateIndex
CREATE INDEX "auto_response_templates_isActive_idx" ON "auto_response_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "auto_responses_responseId_key" ON "auto_responses"("responseId");

-- CreateIndex
CREATE INDEX "auto_responses_ticketId_idx" ON "auto_responses"("ticketId");

-- CreateIndex
CREATE INDEX "auto_responses_responseId_idx" ON "auto_responses"("responseId");

-- CreateIndex
CREATE INDEX "auto_responses_threadId_idx" ON "auto_responses"("threadId");

-- CreateIndex
CREATE INDEX "auto_responses_sentAt_idx" ON "auto_responses"("sentAt");

-- CreateIndex
CREATE INDEX "email_followups_autoResponseId_idx" ON "email_followups"("autoResponseId");

-- CreateIndex
CREATE INDEX "email_followups_ticketId_idx" ON "email_followups"("ticketId");

-- CreateIndex
CREATE INDEX "email_followups_processedAt_idx" ON "email_followups"("processedAt");

-- AddForeignKey
ALTER TABLE "auto_response_templates" ADD CONSTRAINT "auto_response_templates_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_response_templates" ADD CONSTRAINT "auto_response_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_responses" ADD CONSTRAINT "auto_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_responses" ADD CONSTRAINT "auto_responses_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "auto_response_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_followups" ADD CONSTRAINT "email_followups_autoResponseId_fkey" FOREIGN KEY ("autoResponseId") REFERENCES "auto_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_followups" ADD CONSTRAINT "email_followups_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

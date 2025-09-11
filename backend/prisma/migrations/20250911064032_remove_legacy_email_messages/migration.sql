/*
  Warnings:

  - The `type` column on the `app_settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `priority` on the `ticket_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ticket_tasks` table. All the data in the column will be lost.
  - You are about to drop the `system_settings` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `taskPriorityId` to the `ticket_tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taskStatusId` to the `ticket_tasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'FILE');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('WEB', 'EMAIL', 'API', 'MOBILE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailMessageType" AS ENUM ('NEW', 'REPLY');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'PROCESSING', 'PROCESSED', 'ERROR');

-- AlterTable
ALTER TABLE "app_settings" DROP COLUMN "type",
ADD COLUMN     "type" "SettingType" NOT NULL DEFAULT 'JSON';

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "assignmentStrategy" TEXT NOT NULL DEFAULT 'round_robin',
ADD COLUMN     "autoAssignEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxTicketsPerAgent" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "ticket_tasks" DROP COLUMN "priority",
DROP COLUMN "status",
ADD COLUMN     "taskPriorityId" TEXT NOT NULL,
ADD COLUMN     "taskStatusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "assignedToDepartmentId" TEXT,
ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'WEB';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assignmentPriority" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastAssignmentAt" TIMESTAMP(3),
ADD COLUMN     "maxConcurrentTickets" INTEGER NOT NULL DEFAULT 10;

-- DropTable
DROP TABLE "system_settings";

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "type" "EmailMessageType" NOT NULL DEFAULT 'NEW',
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "cc" TEXT,
    "bcc" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "htmlBody" TEXT,
    "ticketId" TEXT,
    "userId" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "rawMeta" JSONB,
    "attachments" JSONB,
    "deliveryStatus" JSONB,
    "readAt" TIMESTAMP(3),
    "replyTo" TEXT,
    "inReplyTo" TEXT,
    "references" TEXT,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_status_history" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromStatus" "TaskStatus" NOT NULL,
    "toStatus" "TaskStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignment_history" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "task_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_statuses" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT 'gray',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "task_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_priorities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT 'gray',
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "task_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_assignment_history" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "fromDepartmentId" TEXT,
    "toDepartmentId" TEXT,
    "assignedById" TEXT NOT NULL,
    "reason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_messageId_key" ON "email_logs"("messageId");

-- CreateIndex
CREATE INDEX "email_logs_direction_idx" ON "email_logs"("direction");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt");

-- CreateIndex
CREATE INDEX "email_logs_receivedAt_idx" ON "email_logs"("receivedAt");

-- CreateIndex
CREATE INDEX "email_logs_ticketId_idx" ON "email_logs"("ticketId");

-- CreateIndex
CREATE INDEX "email_logs_userId_idx" ON "email_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_statuses_key_key" ON "task_statuses"("key");

-- CreateIndex
CREATE UNIQUE INDEX "task_priorities_key_key" ON "task_priorities"("key");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToDepartmentId_fkey" FOREIGN KEY ("assignedToDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_tasks" ADD CONSTRAINT "ticket_tasks_taskStatusId_fkey" FOREIGN KEY ("taskStatusId") REFERENCES "task_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_tasks" ADD CONSTRAINT "ticket_tasks_taskPriorityId_fkey" FOREIGN KEY ("taskPriorityId") REFERENCES "task_priorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ticket_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ticket_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignment_history" ADD CONSTRAINT "task_assignment_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ticket_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignment_history" ADD CONSTRAINT "task_assignment_history_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignment_history" ADD CONSTRAINT "task_assignment_history_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignment_history" ADD CONSTRAINT "task_assignment_history_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignment_history" ADD CONSTRAINT "ticket_assignment_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignment_history" ADD CONSTRAINT "ticket_assignment_history_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignment_history" ADD CONSTRAINT "ticket_assignment_history_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignment_history" ADD CONSTRAINT "ticket_assignment_history_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignment_history" ADD CONSTRAINT "ticket_assignment_history_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignment_history" ADD CONSTRAINT "ticket_assignment_history_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "setting_history_ns_key_idx" RENAME TO "setting_history_namespace_key_idx";

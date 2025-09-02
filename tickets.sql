/*
 Navicat Premium Dump SQL

 Source Server         : local docker postgres
 Source Server Type    : PostgreSQL
 Source Server Version : 170005 (170005)
 Source Host           : localhost:5432
 Source Catalog        : ticketing_db
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170005 (170005)
 File Encoding         : 65001

 Date: 02/09/2025 08:57:25
*/


-- ----------------------------
-- Type structure for EventType
-- ----------------------------
DROP TYPE IF EXISTS "public"."EventType";
CREATE TYPE "public"."EventType" AS ENUM (
  'TICKET_DUE',
  'SLA_DEADLINE',
  'AGENT_ASSIGNMENT',
  'FOLLOW_UP',
  'ESCALATION'
);

-- ----------------------------
-- Type structure for Priority
-- ----------------------------
DROP TYPE IF EXISTS "public"."Priority";
CREATE TYPE "public"."Priority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- ----------------------------
-- Type structure for Status
-- ----------------------------
DROP TYPE IF EXISTS "public"."Status";
CREATE TYPE "public"."Status" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'ESCALATED'
);

-- ----------------------------
-- Type structure for TaskStatus
-- ----------------------------
DROP TYPE IF EXISTS "public"."TaskStatus";
CREATE TYPE "public"."TaskStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED'
);

-- ----------------------------
-- Table structure for _prisma_migrations
-- ----------------------------
DROP TABLE IF EXISTS "public"."_prisma_migrations";
CREATE TABLE "public"."_prisma_migrations" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "checksum" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "finished_at" timestamptz(6),
  "migration_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "logs" text COLLATE "pg_catalog"."default",
  "rolled_back_at" timestamptz(6),
  "started_at" timestamptz(6) NOT NULL DEFAULT now(),
  "applied_steps_count" int4 NOT NULL DEFAULT 0
)
;

-- ----------------------------
-- Records of _prisma_migrations
-- ----------------------------
INSERT INTO "public"."_prisma_migrations" VALUES ('f1db9b33-c710-481d-acb2-96d461f4ad07', '59c4b8274256dacd5293e7c782aa3d14f00922ec35dd9c0d2d129795218fe887', '2025-09-01 22:13:54.860187+00', '20250901220428_add_name_fields', NULL, NULL, '2025-09-01 22:13:54.673612+00', 1);

-- ----------------------------
-- Table structure for attachments
-- ----------------------------
DROP TABLE IF EXISTS "public"."attachments";
CREATE TABLE "public"."attachments" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "ticketId" text COLLATE "pg_catalog"."default",
  "commentId" text COLLATE "pg_catalog"."default",
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "filePath" text COLLATE "pg_catalog"."default" NOT NULL,
  "fileSize" int4 NOT NULL,
  "mimeType" text COLLATE "pg_catalog"."default" NOT NULL,
  "uploadedBy" text COLLATE "pg_catalog"."default" NOT NULL,
  "uploadedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Records of attachments
-- ----------------------------

-- ----------------------------
-- Table structure for comments
-- ----------------------------
DROP TABLE IF EXISTS "public"."comments";
CREATE TABLE "public"."comments" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "ticketId" text COLLATE "pg_catalog"."default" NOT NULL,
  "authorId" text COLLATE "pg_catalog"."default" NOT NULL,
  "content" text COLLATE "pg_catalog"."default" NOT NULL,
  "isInternal" bool NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Records of comments
-- ----------------------------
INSERT INTO "public"."comments" VALUES ('cmf1offg8000dtt5g4htfq3ra', 'cmf1offg10009tt5g7h0vf44d', 'cmf1off7e0001tt5gnj3pwfmk', 'I''ve identified the issue. It appears to be related to the recent password policy update. I''m working on a solution.', 'f', '2025-09-01 22:14:01.976');
INSERT INTO "public"."comments" VALUES ('cmf1offgf000ftt5ggywbp7n0', 'cmf1offg10009tt5g7h0vf44d', 'cmf1off7e0001tt5gnj3pwfmk', 'Internal note: Need to check if this affects other users in the Sales department.', 't', '2025-09-01 22:14:01.984');

-- ----------------------------
-- Table structure for knowledge_base
-- ----------------------------
DROP TABLE IF EXISTS "public"."knowledge_base";
CREATE TABLE "public"."knowledge_base" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "title" text COLLATE "pg_catalog"."default" NOT NULL,
  "content" text COLLATE "pg_catalog"."default" NOT NULL,
  "category" text COLLATE "pg_catalog"."default" NOT NULL,
  "tags" jsonb,
  "views" int4 NOT NULL DEFAULT 0,
  "helpful" int4 NOT NULL DEFAULT 0,
  "authorId" text COLLATE "pg_catalog"."default",
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL
)
;

-- ----------------------------
-- Records of knowledge_base
-- ----------------------------
INSERT INTO "public"."knowledge_base" VALUES ('cmf1offgi000htt5glm0cz3lx', 'How to Reset Your Password', 'If you''re having trouble accessing your account, follow these steps to reset your password...', 'account', '["password", "authentication", "account"]', 0, 0, 'cmf1off7e0001tt5gnj3pwfmk', '2025-09-01 22:14:01.987', '2025-09-01 22:14:01.987');
INSERT INTO "public"."knowledge_base" VALUES ('cmf1offgp000jtt5gtds2xygz', 'Common Printer Issues and Solutions', 'This guide covers the most common printer problems and how to resolve them...', 'hardware', '["printer", "hardware", "troubleshooting"]', 0, 0, 'cmf1off830003tt5gsuzvdji5', '2025-09-01 22:14:01.993', '2025-09-01 22:14:01.993');
INSERT INTO "public"."knowledge_base" VALUES ('cmf1offgs000ltt5gi1n0bx1h', 'Setting Up VPN for Remote Work', 'Learn how to configure your VPN connection for secure remote access to company resources...', 'network', '["vpn", "remote-work", "security"]', 0, 0, 'cmf1off7q0002tt5gk37arjht', '2025-09-01 22:14:01.996', '2025-09-01 22:14:01.996');

-- ----------------------------
-- Table structure for ticket_events
-- ----------------------------
DROP TABLE IF EXISTS "public"."ticket_events";
CREATE TABLE "public"."ticket_events" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "ticketId" text COLLATE "pg_catalog"."default" NOT NULL,
  "title" text COLLATE "pg_catalog"."default" NOT NULL,
  "date" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" "public"."EventType" NOT NULL,
  "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM'::"Priority",
  "description" text COLLATE "pg_catalog"."default",
  "assignedTo" text COLLATE "pg_catalog"."default",
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Records of ticket_events
-- ----------------------------

-- ----------------------------
-- Table structure for ticket_tasks
-- ----------------------------
DROP TABLE IF EXISTS "public"."ticket_tasks";
CREATE TABLE "public"."ticket_tasks" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "ticketId" text COLLATE "pg_catalog"."default" NOT NULL,
  "title" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default" NOT NULL,
  "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING'::"TaskStatus",
  "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM'::"Priority",
  "progress" int2 NOT NULL DEFAULT 0,
  "assignedTo" text COLLATE "pg_catalog"."default",
  "dueDate" timestamp(3),
  "startDate" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedDate" timestamp(3),
  "estimatedHours" float8,
  "actualHours" float8,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL
)
;

-- ----------------------------
-- Records of ticket_tasks
-- ----------------------------

-- ----------------------------
-- Table structure for tickets
-- ----------------------------
DROP TABLE IF EXISTS "public"."tickets";
CREATE TABLE "public"."tickets" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "title" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default" NOT NULL,
  "category" text COLLATE "pg_catalog"."default" NOT NULL,
  "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM'::"Priority",
  "status" "public"."Status" NOT NULL DEFAULT 'OPEN'::"Status",
  "submittedBy" text COLLATE "pg_catalog"."default" NOT NULL,
  "submittedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedTo" text COLLATE "pg_catalog"."default",
  "assignedAt" timestamp(3),
  "dueDate" timestamp(3),
  "resolvedAt" timestamp(3),
  "resolution" text COLLATE "pg_catalog"."default",
  "satisfaction" int2,
  "tags" jsonb,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL
)
;

-- ----------------------------
-- Records of tickets
-- ----------------------------
INSERT INTO "public"."tickets" VALUES ('cmf1offfr0007tt5ggzk011me', 'Printer not working', 'The office printer is showing an error message and won''t print any documents. Error code: E-04.', 'hardware', 'HIGH', 'OPEN', 'cmf1offf90004tt5gudpp39gf', '2025-09-01 22:14:01.96', NULL, NULL, NULL, NULL, NULL, NULL, '["printer", "hardware", "urgent"]', '2025-09-01 22:14:01.96', '2025-09-01 22:14:01.96');
INSERT INTO "public"."tickets" VALUES ('cmf1offg10009tt5g7h0vf44d', 'Email access issues', 'I cannot access my email account. Getting "authentication failed" error when trying to log in.', 'software', 'MEDIUM', 'IN_PROGRESS', 'cmf1offfl0005tt5g4d2571s6', '2025-09-01 22:14:01.97', 'cmf1off7e0001tt5gnj3pwfmk', '2025-09-01 22:14:01.968', NULL, NULL, NULL, NULL, '["email", "authentication", "software"]', '2025-09-01 22:14:01.97', '2025-09-01 22:14:01.97');
INSERT INTO "public"."tickets" VALUES ('cmf1offg5000btt5gtpjq4xai', 'WiFi connection problems', 'WiFi keeps disconnecting every few minutes. This is affecting my ability to work remotely.', 'network', 'HIGH', 'OPEN', 'cmf1offf90004tt5gudpp39gf', '2025-09-01 22:14:01.973', NULL, NULL, NULL, NULL, NULL, NULL, '["wifi", "network", "remote-work"]', '2025-09-01 22:14:01.973', '2025-09-01 22:14:01.973');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "firstName" text COLLATE "pg_catalog"."default" NOT NULL,
  "lastName" text COLLATE "pg_catalog"."default" NOT NULL,
  "middleName" text COLLATE "pg_catalog"."default",
  "email" text COLLATE "pg_catalog"."default" NOT NULL,
  "password" text COLLATE "pg_catalog"."default" NOT NULL,
  "role" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'user'::text,
  "department" text COLLATE "pg_catalog"."default",
  "avatar" text COLLATE "pg_catalog"."default",
  "phone" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "isAgent" bool NOT NULL DEFAULT false,
  "skills" jsonb,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL
)
;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO "public"."users" VALUES ('cmf1offfl0005tt5g4d2571s6', 'Bob', 'Employee', NULL, 'bob.employee@company.com', '$2b$12$opxSPdvq4Qf1gQvxLbnkpO98fIHvoocrlrNXq/wAtZX7I1Ky3HE3S', 'user', 'Sales', 'https://robohash.org/john_doe?size=200x200', NULL, NULL, 'f', NULL, '2025-09-01 22:14:01.954', '2025-09-01 23:09:24.741');
INSERT INTO "public"."users" VALUES ('cmf1offf90004tt5gudpp39gf', 'Alice', 'User', NULL, 'alice.user@company.com', '$2b$12$opxSPdvq4Qf1gQvxLbnkpO98fIHvoocrlrNXq/wAtZX7I1Ky3HE3S', 'user', 'Marketing', 'https://robohash.org/john_doe?size=200x200', NULL, NULL, 'f', NULL, '2025-09-01 22:14:01.942', '2025-09-01 23:09:27.285');
INSERT INTO "public"."users" VALUES ('cmf1off830003tt5gsuzvdji5', 'Mike', 'Hardware', NULL, 'mike.hardware@company.com', '$2b$12$1BPoz7T3Ale9oqiWqI3dDOG52tTQe.qJiBUpPtLhJNtBXRWTYYD8G', 'support_agent', 'IT Support', 'https://robohash.org/john_doe?size=200x200', NULL, NULL, 't', '["Hardware", "Peripherals", "Maintenance"]', '2025-09-01 22:14:01.684', '2025-09-01 23:09:29.735');
INSERT INTO "public"."users" VALUES ('cmf1off7q0002tt5gk37arjht', 'Sarah', 'Tech', NULL, 'sarah.tech@company.com', '$2b$12$1BPoz7T3Ale9oqiWqI3dDOG52tTQe.qJiBUpPtLhJNtBXRWTYYD8G', 'support_agent', 'IT Support', 'https://robohash.org/john_doe?size=200x200', NULL, NULL, 't', '["Software", "Database", "Cloud", "DevOps"]', '2025-09-01 22:14:01.671', '2025-09-01 23:09:32.253');
INSERT INTO "public"."users" VALUES ('cmf1off7e0001tt5gnj3pwfmk', 'John', 'Support', NULL, 'john.support@company.com', '$2b$12$1BPoz7T3Ale9oqiWqI3dDOG52tTQe.qJiBUpPtLhJNtBXRWTYYD8G', 'support_agent', 'IT Support', 'https://robohash.org/john_doe?size=200x200', NULL, NULL, 't', '["Network", "Hardware", "Software", "Security"]', '2025-09-01 22:14:01.658', '2025-09-01 23:09:35.967');
INSERT INTO "public"."users" VALUES ('cmf1ofez60000tt5g0h83dq73', 'System', 'Administrator', NULL, 'admin@company.com', '$2b$12$MjmklJ1Fja.0EgHwJkzGcOoqbrZHlIoA68Q8mS89y1iHQ0GkG5EMy', 'admin', 'IT', 'https://robohash.org/john_doe?size=200x200', NULL, NULL, 't', '["System Administration", "Security", "Networking"]', '2025-09-01 22:14:01.362', '2025-09-01 23:09:38.637');
INSERT INTO "public"."users" VALUES ('cmf1q3x2w000010ggjum5uj4j', 'fred', 'escuro', NULL, 'fredmann.escuro@gmail.com', '$2a$10$GEPvKhgx7JSUv5TzGBo4huTCT2LeREebhgFL6QVzV9I1r2.E.xDEK', 'admin', 'IT', 'https://api.dicebear.com/7.x/initials/svg?seed=fred%20escuro&backgroundColor=1f2937&textColor=ffffff', NULL, NULL, 'f', NULL, '2025-09-01 23:01:04.185', '2025-09-02 00:10:05.596');

-- ----------------------------
-- Primary Key structure for table _prisma_migrations
-- ----------------------------
ALTER TABLE "public"."_prisma_migrations" ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table attachments
-- ----------------------------
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table comments
-- ----------------------------
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table knowledge_base
-- ----------------------------
ALTER TABLE "public"."knowledge_base" ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table ticket_events
-- ----------------------------
ALTER TABLE "public"."ticket_events" ADD CONSTRAINT "ticket_events_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table ticket_tasks
-- ----------------------------
ALTER TABLE "public"."ticket_tasks" ADD CONSTRAINT "ticket_tasks_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table tickets
-- ----------------------------
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table users
-- ----------------------------
CREATE UNIQUE INDEX "users_email_key" ON "public"."users" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table attachments
-- ----------------------------
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table comments
-- ----------------------------
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table knowledge_base
-- ----------------------------
ALTER TABLE "public"."knowledge_base" ADD CONSTRAINT "knowledge_base_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table ticket_events
-- ----------------------------
ALTER TABLE "public"."ticket_events" ADD CONSTRAINT "ticket_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table ticket_tasks
-- ----------------------------
ALTER TABLE "public"."ticket_tasks" ADD CONSTRAINT "ticket_tasks_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table tickets
-- ----------------------------
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

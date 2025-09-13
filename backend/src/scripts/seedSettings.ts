import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureEnum() {
  // Create enum if missing to satisfy default on type column
  await prisma.$executeRawUnsafe(`DO $$ BEGIN
    CREATE TYPE "SettingType" AS ENUM ('STRING','NUMBER','BOOLEAN','JSON','FILE');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
}

async function upsert(namespace: string, key: string, value: any) {
  const json = JSON.stringify(value);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "app_settings" ("id","namespace","key","value","createdAt","updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3::jsonb, now(), now())
     ON CONFLICT ("namespace","key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now();`,
    namespace,
    key,
    json
  );
}

async function upsertSecret(namespace: string, key: string, value: any) {
  const json = JSON.stringify(value);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "app_settings" ("id","namespace","key","value","isSecret","createdAt","updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3::jsonb, true, now(), now())
     ON CONFLICT ("namespace","key") DO UPDATE SET "value" = EXCLUDED."value", "isSecret" = true, "updatedAt" = now();`,
    namespace,
    key,
    json
  );
}

async function main() {
  await ensureEnum();

  // Branding defaults
  await upsert('branding', 'appName', 'TicketHub');
  await upsert('branding', 'logoUrl', null);

  // Company defaults
  await upsert('company', 'name', 'TicketHub Inc.');
  await upsert('company', 'email', 'support@tickethub.com');
  await upsert('company', 'phone', '+1 (555) 123-4567');
  await upsert('company', 'address', '123 Business St, Suite 100, City, State 12345');
  await upsert('company', 'timezone', 'UTC');
  await upsert('company', 'language', 'en');
  await upsert('company', 'currency', 'USD');
  await upsert('company', 'businessHours', { start: '09:00', end: '17:00', timezone: 'UTC' });

  // Feature flags (optional)
  await upsert('features', 'analytics', false);
  await upsert('features', 'fileUpload', true);

  // SMTP defaults
  await upsert('email.smtp', 'host', 'mail.6883432.apps.wesupportinc.com');
  await upsert('email.smtp', 'port', 465);
  await upsert('email.smtp', 'secure', true);
  await upsert('email.smtp', 'fromAddress', 'TicketHub (hd@wesupportinc.com)');
  await upsertSecret('email.smtp', 'user', 'hd@wesupportinc.com');
  await upsertSecret('email.smtp', 'password', 'wsi@WeSupportinc');

  // Notification defaults
  await upsert('notifications', 'emailEnabled', true);
  await upsert('notifications', 'inAppEnabled', true);
  await upsert('notifications', 'pushEnabled', false);
  await upsert('notifications', 'frequency', 'immediate');

  // Inbound email (IMAP) defaults
  await upsert('email.inbound', 'imapHost', 'mail.6883432.apps.wesupportinc.com');
  await upsert('email.inbound', 'imapPort', 993);
  await upsert('email.inbound', 'imapSecure', true);
  await upsertSecret('email.inbound', 'imapUser', 'hd@wesupportinc.com');
  await upsertSecret('email.inbound', 'imapPassword', 'wsi@WeSupportinc');
  await upsert('email.inbound', 'folder', 'INBOX');
  await upsert('email.inbound', 'moveOnSuccessFolder', 'INBOX.Processed');
  await upsert('email.inbound', 'moveOnErrorFolder', 'INBOX.Errors');
  
  // Domain restriction settings (new comprehensive system)
  await upsert('email.inbound', 'domainRestrictionMode', 'allow_all');
  await upsert('email.inbound', 'allowedDomains', []);
  await upsert('email.inbound', 'blockedDomains', []);
  await upsert('email.inbound', 'maxEmailsPerHour', 100);
  await upsert('email.inbound', 'maxEmailsPerDay', 1000);
  await upsert('email.inbound', 'maxEmailsPerSender', 10);
  await upsert('email.inbound', 'enableFloodingProtection', true);
  await upsert('email.inbound', 'enableSpamFilter', true);
  await upsert('email.inbound', 'requireValidFrom', true);
  await upsert('email.inbound', 'blockEmptySubjects', false);
  await upsert('email.inbound', 'blockAutoReplies', true);
  await upsert('email.inbound', 'enableRateLimiting', true);
  await upsert('email.inbound', 'rateLimitWindow', 60);
  await upsert('email.inbound', 'maxAttachments', 10);
  await upsert('email.inbound', 'maxAttachmentSize', 25);
  
  // Legacy settings (for backward compatibility)
  await upsert('email.inbound', 'defaultCategoryId', null);
  await upsert('email.inbound', 'defaultPriorityId', null);
  await upsert('email.inbound', 'autoreplyEnabled', false);
  await upsert('email.inbound', 'autoreplyFromName', 'TicketHub');
  await upsert('email.inbound', 'autoreplyFromEmail', 'no-reply@example.com');

  // Task settings defaults
  await upsert('tasks', 'defaultAssignee', null);
  await upsert('tasks', 'allowedStatuses', ['PENDING','IN_PROGRESS','COMPLETED','BLOCKED']);
  await upsert('tasks', 'enableComments', true);
  await upsert('tasks', 'notifyOnAssignment', true);
  await upsert('tasks', 'notifyOnDueSoon', true);
  await upsert('tasks', 'dueSoonThresholdHours', 24);
  await upsert('tasks', 'blockedEscalationHours', 48);
  // NOTE: task statuses and priorities are now first-class tables

  // Email response settings (consolidated)
  await upsert('email.responses', 'include_original_content', true);
  await upsert('email.responses', 'include_all_recipients', false);
  await upsert('email.responses', 'include_cc_recipients', true);
  await upsert('email.responses', 'include_bcc_recipients', false);

  // Auto-response settings (without redundant includeOriginalContent)
  await upsert('system', 'auto_response_enabled', true);
  await upsert('system', 'auto_response_content_truncation_length', 500);
  await upsert('system', 'auto_response_template', `Thank you for contacting our support team. We have received your ticket and will review it shortly.

Ticket Details:
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{priority}}
- Category: {{category}}

{{#includeOriginalContent}}
Original Message:
{{originalContent}}
{{/includeOriginalContent}}

Our support team will get back to you as soon as possible. You can track the progress of your ticket by logging into our support portal.

Best regards,
Support Team`);
  await upsert('system', 'auto_response_subject_template', 'Re: {{ticketTitle}} - Ticket #{{ticketNumber}}');

  // Google auth defaults
  await upsert('auth.google', 'enabled', false);
  await upsert('auth.google', 'redirectUri', 'http://localhost:3000/auth/callback/google');
  await upsertSecret('auth.google', 'clientId', '');
  await upsertSecret('auth.google', 'clientSecret', '');

  console.log('✅ Seeded settings: branding, company, features, SMTP, notifications, email.inbound, email.responses, auto-response, auth.google');
}

export async function seedSettings() {
  await ensureEnum();
  await main();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}



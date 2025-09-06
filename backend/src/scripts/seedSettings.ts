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
  await upsert('email.smtp', 'host', 'smtp.example.com');
  await upsert('email.smtp', 'port', 587);
  await upsert('email.smtp', 'secure', false);
  await upsert('email.smtp', 'fromAddress', 'no-reply@example.com');
  await upsertSecret('email.smtp', 'user', 'no-reply@example.com');
  await upsertSecret('email.smtp', 'password', 'change-me');

  // Notification defaults
  await upsert('notifications', 'emailEnabled', true);
  await upsert('notifications', 'inAppEnabled', true);
  await upsert('notifications', 'pushEnabled', false);
  await upsert('notifications', 'frequency', 'immediate');

  // Google auth defaults
  await upsert('auth.google', 'enabled', false);
  await upsert('auth.google', 'redirectUri', 'http://localhost:3000/auth/callback/google');
  await upsertSecret('auth.google', 'clientId', '');
  await upsertSecret('auth.google', 'clientSecret', '');

  console.log('✅ Seeded settings: branding, company, features, SMTP, notifications, auth.google');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



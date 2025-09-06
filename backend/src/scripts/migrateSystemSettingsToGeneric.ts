import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const legacy = await prisma.systemSettings.findFirst();
  if (!legacy) {
    console.log('No legacy SystemSettings found. Skipping migration.');
    return;
  }
  const ops: any[] = [];
  const db: any = prisma as any;

  const upsertKV = (namespace: string, key: string, value: any, type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'FILE') =>
    db.appSetting.upsert({
      where: { namespace_key: { namespace, key } },
      update: { value, type },
      create: { namespace, key, value, type }
    });

  // branding
  ops.push(upsertKV('branding', 'appName', legacy.appName, 'STRING'));
  ops.push(upsertKV('branding', 'logoUrl', legacy.appLogoUrl || null, 'FILE'));

  // company
  ops.push(upsertKV('company', 'name', legacy.companyName, 'STRING'));
  ops.push(upsertKV('company', 'email', legacy.companyEmail, 'STRING'));
  ops.push(upsertKV('company', 'phone', legacy.companyPhone || '', 'STRING'));
  ops.push(upsertKV('company', 'address', legacy.companyAddress || '', 'STRING'));
  ops.push(upsertKV('company', 'timezone', legacy.timezone, 'STRING'));
  ops.push(upsertKV('company', 'language', legacy.language, 'STRING'));
  ops.push(upsertKV('company', 'currency', legacy.currency, 'STRING'));
  ops.push(upsertKV('company', 'businessHours', (legacy as any).businessHours || null, 'JSON'));

  await prisma.$transaction(ops);
  console.log('Migration complete: SystemSettings -> AppSetting namespaces');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



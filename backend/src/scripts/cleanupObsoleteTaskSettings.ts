import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  try {
    const res = await (prisma as any).appSetting.deleteMany({ where: { namespace: 'tasks', key: { in: ['statuses','priorities'] } } });
    console.log('Deleted obsolete task settings rows:', (res as any)?.count ?? res);
  } catch (e) {
    console.error('Failed to clean obsolete task settings:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { cleanup };



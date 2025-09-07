import { PrismaClient } from '@prisma/client';

const prisma: any = new PrismaClient();

async function seedTaskMeta() {
  console.log('🌱 Seeding task statuses and priorities...');
  try {
    const statuses = [
      { key: 'PENDING', name: 'Pending', color: 'gray', sortOrder: 1 },
      { key: 'IN_PROGRESS', name: 'In Progress', color: 'blue', sortOrder: 2 },
      { key: 'COMPLETED', name: 'Completed', color: 'green', sortOrder: 3 },
      { key: 'BLOCKED', name: 'Blocked', color: 'red', sortOrder: 4 }
    ];

    for (const s of statuses) {
      await prisma.taskStatusDef.upsert({
        where: { key: s.key },
        update: { name: s.name, color: s.color, sortOrder: s.sortOrder },
        create: s
      });
    }

    const priorities = [
      { key: 'LOW', name: 'Low', color: 'green', level: 1, sortOrder: 1 },
      { key: 'MEDIUM', name: 'Medium', color: 'yellow', level: 5, sortOrder: 2 },
      { key: 'HIGH', name: 'High', color: 'orange', level: 8, sortOrder: 3 },
      { key: 'CRITICAL', name: 'Critical', color: 'red', level: 10, sortOrder: 4 }
    ];

    for (const p of priorities) {
      await prisma.taskPriorityDef.upsert({
        where: { key: p.key },
        update: { name: p.name, color: p.color, level: p.level, sortOrder: p.sortOrder },
        create: p
      });
    }

    console.log('✅ Task statuses and priorities seeded.');
  } catch (e) {
    console.error('❌ Error seeding task meta:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedTaskMeta().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { seedTaskMeta };



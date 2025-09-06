import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMenu() {
  console.log('🌱 Seeding menu...');

  try {
    // Ensure base permissions exist
    const permissionKeys = [
      'tickets:read',
      'users:read',
      'users:write',
      'reports:read',
      'knowledge:read',
    ];

    const permissions = await Promise.all(
      permissionKeys.map(key =>
        prisma.permission.upsert({
          where: { key },
          update: {},
          create: { key, description: key.replace(':', ' ') },
        })
      )
    );
    const permByKey = new Map(permissions.map(p => [p.key, p]));

    // Helper to create a menu item with optional permission keys
    const createMenu = async (
      label: string,
      sortOrder: number,
      opts: { path?: string; icon?: string; parentId?: string; permissionKeys?: string[] } = {}
    ) => {
      const item = await prisma.menuItem.create({
        data: {
          label,
          sortOrder,
          path: opts.path,
          icon: opts.icon,
          parentId: opts.parentId ?? null,
          isActive: true,
        },
      });

      if (opts.permissionKeys && opts.permissionKeys.length > 0) {
        await prisma.menuItemPermission.createMany({
          data: opts.permissionKeys
            .map(k => permByKey.get(k))
            .filter(Boolean)
            .map(p => ({ menuItemId: item.id, permissionId: (p as any).id })),
          skipDuplicates: true,
        });
      }

      return item;
    };

    // Clear existing menu for idempotency (optional)
    await prisma.menuItemPermission.deleteMany({});
    await prisma.menuItem.deleteMany({});

    // Sections
    const core = await createMenu('Core', 1);
    const support = await createMenu('Support', 2);
    const tools = await createMenu('Tools', 3);
    const settings = await createMenu('Settings', 4);

    // Core items
    await createMenu('Dashboard', 1, { parentId: core.id, path: '/', icon: 'Home' });
    await createMenu('Tickets', 2, { parentId: core.id, path: '/tickets', icon: 'MessageSquare', permissionKeys: ['tickets:read'] });

    // Support items
    await createMenu('Users', 1, { parentId: support.id, path: '/users', icon: 'Users', permissionKeys: ['users:read'] });
    await createMenu('Tasks', 2, { parentId: support.id, path: '/tasks', icon: 'FileText', permissionKeys: ['tickets:read'] });

    // Tools items
    await createMenu('Calendar', 1, { parentId: tools.id, path: '/calendar', icon: 'Calendar', permissionKeys: ['tickets:read'] });
    await createMenu('Reports', 2, { parentId: tools.id, path: '/reports', icon: 'BarChart3', permissionKeys: ['reports:read'] });
    await createMenu('Knowledge Base', 3, { parentId: tools.id, path: '/knowledge-base', icon: 'Headphones', permissionKeys: ['knowledge:read'] });
    await createMenu('User Management', 4, { parentId: tools.id, path: '/admin/users', icon: 'Shield', permissionKeys: ['users:write'] });

    // Settings items (grouped under Settings section)
    await createMenu('General', 1, { parentId: settings.id, path: '/settings', icon: 'Building2', permissionKeys: ['users:write'] });
    await createMenu('Tickets', 2, { parentId: settings.id, path: '/settings?tab=tickets', icon: 'Ticket', permissionKeys: ['tickets:read'] });
    await createMenu('Users', 3, { parentId: settings.id, path: '/settings?tab=users', icon: 'Users', permissionKeys: ['users:read'] });
    await createMenu('Notifications', 4, { parentId: settings.id, path: '/settings?tab=notifications', icon: 'Bell', permissionKeys: ['users:read'] });

    console.log('✅ Menu seeded');
  } catch (e) {
    console.error('❌ Seed menu failed', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedMenu()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedAutoAssignment() {
  console.log('🌱 Seeding auto-assignment permissions and menu...');

  try {
    // Create auto-assignment permissions
    const autoAssignmentPermissions = [
      {
        key: 'assignment-rules:read',
        description: 'View assignment rules and configuration'
      },
      {
        key: 'assignment-rules:write',
        description: 'Create and modify assignment rules'
      },
      {
        key: 'assignment-rules:delete',
        description: 'Delete assignment rules'
      },
      {
        key: 'assignment-rules:test',
        description: 'Test assignment rules'
      },
      {
        key: 'assignment-rules:manage',
        description: 'Full management of assignment rules and auto-assignment settings'
      }
    ];

    console.log('🔐 Creating auto-assignment permissions...');
    const permissions = await Promise.all(
      autoAssignmentPermissions.map(perm =>
        prisma.permission.upsert({
          where: { key: perm.key },
          update: {},
          create: perm
        })
      )
    );

    console.log('✅ Auto-assignment permissions created');

    // Get existing roles
    const roles = await prisma.role.findMany({
      where: { name: { in: ['admin', 'manager', 'agent'] } }
    });

    const roleMap = new Map(roles.map(r => [r.name, r]));

    // Assign permissions to roles
    const rolePermissions = [
      {
        role: 'admin',
        permissions: [
          'assignment-rules:read',
          'assignment-rules:write', 
          'assignment-rules:delete',
          'assignment-rules:test',
          'assignment-rules:manage'
        ]
      },
      {
        role: 'manager',
        permissions: [
          'assignment-rules:read',
          'assignment-rules:write',
          'assignment-rules:test'
        ]
      },
      {
        role: 'agent',
        permissions: [
          'assignment-rules:read'
        ]
      }
    ];

    console.log('🔗 Assigning permissions to roles...');
    for (const { role, permissions: permKeys } of rolePermissions) {
      const roleEntity = roleMap.get(role);
      if (!roleEntity) continue;

      for (const permKey of permKeys) {
        const permission = permissions.find(p => p.key === permKey);
        if (!permission) continue;

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roleEntity.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: roleEntity.id,
            permissionId: permission.id
          }
        });
      }
    }

    console.log('✅ Role permissions assigned');

    // Create auto-assignment menu items
    console.log('📋 Creating auto-assignment menu items...');

    // Get the Settings section
    const settingsSection = await prisma.menuItem.findFirst({
      where: { label: 'Settings' }
    });

    if (!settingsSection) {
      console.log('❌ Settings section not found, creating it...');
      const settingsSection = await prisma.menuItem.create({
        data: {
          label: 'Settings',
          sortOrder: 4,
          isActive: true
        }
      });
    }

    // Create Auto-Assign menu item
    const autoAssignMenuItem = await prisma.menuItem.upsert({
      where: { 
        id: 'auto-assign-menu-item' // Use a fixed ID for upsert
      },
      update: {
        label: 'Auto-Assign',
        path: '/settings?tab=assignment',
        icon: 'Users',
        sortOrder: 6,
        parentId: settingsSection?.id,
        isActive: true
      },
      create: {
        id: 'auto-assign-menu-item',
        label: 'Auto-Assign',
        path: '/settings?tab=assignment',
        icon: 'Users',
        sortOrder: 6,
        parentId: settingsSection?.id,
        isActive: true
      }
    });

    // Link menu item to permissions
    const autoAssignPermissions = permissions.filter(p => 
      p.key.startsWith('assignment-rules:')
    );

    await prisma.menuItemPermission.createMany({
      data: autoAssignPermissions.map(perm => ({
        menuItemId: autoAssignMenuItem.id,
        permissionId: perm.id
      })),
      skipDuplicates: true
    });

    console.log('✅ Auto-assignment menu item created');

    // Create sample assignment rules for existing categories
    console.log('📝 Creating sample assignment rules...');

    const categories = await prisma.ticketCategory.findMany({
      select: { id: true, name: true }
    });

    const departments = await prisma.department.findMany({
      select: { id: true, name: true }
    });

    // Create assignment rules for each category
    for (const category of categories) {
      let targetDepartmentId = null;
      
      // Assign categories to appropriate departments
      if (category.name.toLowerCase().includes('billing')) {
        targetDepartmentId = departments.find(d => d.name === 'Billing')?.id;
      } else if (category.name.toLowerCase().includes('technical') || 
                 category.name.toLowerCase().includes('bug') ||
                 category.name.toLowerCase().includes('software') ||
                 category.name.toLowerCase().includes('hardware') ||
                 category.name.toLowerCase().includes('network')) {
        targetDepartmentId = departments.find(d => d.name === 'IT Support')?.id;
      }

      if (targetDepartmentId) {
        const assignmentRules = [
          {
            assignmentType: 'department',
            targetDepartmentId,
            priority: 1,
            conditions: {
              priority: ['HIGH', 'MEDIUM', 'LOW']
            },
            fallbackTo: 'round_robin'
          }
        ];

        await prisma.ticketCategory.update({
          where: { id: category.id },
          data: {
            autoAssignRules: assignmentRules
          }
        });

        console.log(`✅ Created assignment rules for ${category.name}`);
      }
    }

    // Assign users to departments
    console.log('👥 Assigning users to departments...');
    
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'admin@tickethub.com',
            'manager@tickethub.com', 
            'agent@tickethub.com',
            'developer@tickethub.com'
          ]
        }
      }
    });

    const itSupportDept = departments.find(d => d.name === 'IT Support');
    const billingDept = departments.find(d => d.name === 'Billing');

    // Assign users to departments using the new junction table
    for (const user of users) {
      const assignments = [];
      
      if (user.email === 'admin@tickethub.com' || user.email === 'manager@tickethub.com') {
        if (itSupportDept) assignments.push({ dept: itSupportDept, isPrimary: true, role: 'admin' });
        if (billingDept) assignments.push({ dept: billingDept, isPrimary: false, role: 'member' });
      } else if (user.email === 'agent@tickethub.com' || user.email === 'developer@tickethub.com') {
        if (itSupportDept) assignments.push({ dept: itSupportDept, isPrimary: true, role: 'specialist' });
      }

      for (const assignment of assignments) {
        await prisma.userDepartment.upsert({
          where: {
            userId_departmentId: {
              userId: user.id,
              departmentId: assignment.dept.id
            }
          },
          update: {
            isPrimary: assignment.isPrimary,
            role: assignment.role
          },
          create: {
            userId: user.id,
            departmentId: assignment.dept.id,
            isPrimary: assignment.isPrimary,
            role: assignment.role
          }
        });
        console.log(`✅ Assigned ${user.email} to ${assignment.dept.name} department`);
      }
    }

    console.log('✅ Auto-assignment seeding completed successfully!');

  } catch (error) {
    console.error('❌ Auto-assignment seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedAutoAssignment()
    .then(() => {
      console.log('🎉 Auto-assignment seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Auto-assignment seeding failed:', error);
      process.exit(1);
    });
}

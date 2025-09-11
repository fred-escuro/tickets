import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRbacAbac() {
  console.log('🌱 Seeding RBAC & ABAC data...');
  try {
    // Departments
    const itSupport = await prisma.department.upsert({
      where: { name: 'IT Support' },
      update: {},
      create: {
        name: 'IT Support',
        description: 'Handles IT related support issues',
      }
    });

    const billing = await prisma.department.upsert({
      where: { name: 'Billing' },
      update: {},
      create: {
        name: 'Billing',
        description: 'Handles billing and invoicing queries',
      }
    });

    // Permissions
    const permissionKeys = [
      'tickets:read',
      'tickets:write',
      'tickets:delete',
      'tickets:assign',
      'ticket-status:change',
      'comments:write',
      'attachments:upload',
      'users:read',
      'users:write',
      'knowledge:read',
      'knowledge:write',
      // settings
      'settings:read',
      'settings:write',
      'reports:read'
    ];

    const permissionMap: Record<string, string> = {};
    for (const key of permissionKeys) {
      const perm = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key.replace(/:/g, ' ') }
      });
      permissionMap[key] = perm.id;
    }

    // Roles
    const roles = await Promise.all([
      prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin', description: 'System Administrator', isSystem: true } }),
      prisma.role.upsert({ where: { name: 'manager' }, update: {}, create: { name: 'manager', description: 'Team/Department Manager', isSystem: true } }),
      prisma.role.upsert({ where: { name: 'agent' }, update: {}, create: { name: 'agent', description: 'Support Agent', isSystem: true } }),
      prisma.role.upsert({ where: { name: 'user' }, update: {}, create: { name: 'user', description: 'End User', isSystem: true } })
    ]);

    const [adminRole, managerRole, agentRole, userRole] = roles;

    // Role -> Permission assignments
    const rolePerms: Record<string, string[]> = {
      admin: ['tickets:read','tickets:write','tickets:delete','tickets:assign','ticket-status:change','comments:write','attachments:upload','users:read','users:write','knowledge:read','knowledge:write','settings:read','settings:write','reports:read'],
      manager: ['tickets:read','tickets:write','tickets:assign','ticket-status:change','comments:write','attachments:upload','users:read','knowledge:read','knowledge:write','settings:read','reports:read'],
      agent: ['tickets:read','tickets:write','ticket-status:change','comments:write','attachments:upload','knowledge:read','reports:read'],
      user: ['tickets:read','tickets:write','knowledge:read']
    };

    const pairs: Array<{ roleId: string; permissionId: string }> = [];
    for (const [roleName, keys] of Object.entries(rolePerms)) {
      const roleId = roleName === 'admin' ? adminRole.id : roleName === 'manager' ? managerRole.id : roleName === 'agent' ? agentRole.id : userRole.id;
      for (const k of keys) {
        const permissionId = permissionMap[k];
        if (permissionId) pairs.push({ roleId, permissionId });
      }
    }

    // Create in batches with skipDuplicates
    if (pairs.length > 0) {
      await prisma.rolePermission.createMany({ data: pairs, skipDuplicates: true });
    }

    // Map specific users to roles and departments
    const usersByEmail = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'admin@company.com',
            'john.support@company.com',
            'sarah.tech@company.com',
            'mike.hardware@company.com',
            'alice.user@company.com',
            'bob.employee@company.com',
            // Alternate seed set
            'admin@tickethub.com',
            'manager@tickethub.com',
            'agent@tickethub.com',
            'developer@tickethub.com',
            'customer@tickethub.com',
            'user@tickethub.com'
          ]
        }
      }
    });

    const getUser = (email: string) => usersByEmail.find(u => u.email === email);

    // Company.com set
    const adminUser = getUser('admin@company.com') || getUser('admin@tickethub.com');
    const john = getUser('john.support@company.com') || getUser('agent@tickethub.com');
    const sarah = getUser('sarah.tech@company.com') || getUser('manager@tickethub.com');
    const mike = getUser('mike.hardware@company.com') || getUser('developer@tickethub.com');
    const alice = getUser('alice.user@company.com') || getUser('customer@tickethub.com');
    const bob = getUser('bob.employee@company.com') || getUser('user@tickethub.com');

    // Assign roles
    const linkRole = async (userId: string, roleId: string, isPrimary = false) => {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        create: { userId, roleId, isPrimary },
        update: { isPrimary }
      } as any);
    };

    if (adminUser) await linkRole(adminUser.id, adminRole.id, true);
    if (john) await linkRole(john.id, agentRole.id, true);
    if (sarah) await linkRole(sarah.id, managerRole.id, true);
    if (mike) await linkRole(mike.id, agentRole.id, true);
    if (alice) await linkRole(alice.id, userRole.id, true);
    if (bob) await linkRole(bob.id, userRole.id, true);

    // Assign departments via relational field when available
    const setDept = async (userId: string, deptId: string, deptName: string) => {
      await prisma.userDepartment.upsert({
        where: {
          userId_departmentId: {
            userId: userId,
            departmentId: deptId
          }
        },
        update: {
          isPrimary: true,
          role: 'admin'
        },
        create: {
          userId: userId,
          departmentId: deptId,
          isPrimary: true,
          role: 'admin'
        }
      });
    };

    if (john) await setDept(john.id, itSupport.id, itSupport.name);
    if (sarah) await setDept(sarah.id, itSupport.id, itSupport.name);
    if (mike) await setDept(mike.id, itSupport.id, itSupport.name);

    // Set department manager
    if (sarah) {
      await prisma.department.update({ where: { id: itSupport.id }, data: { managerId: sarah.id } });
    }

    // ABAC Policies (examples)
    const policies = [
      // Admin full access
      {
        name: 'Admin full access',
        description: 'Admins can perform any action',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: adminRole.id,
        resource: '*',
        action: '*',
        conditions: null
      },
      {
        name: 'Agents can read tickets in their department',
        description: 'Allow agents to read tickets scoped to their department',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: agentRole.id,
        resource: 'tickets',
        action: 'read',
        conditions: { in: { 'ticket.assignedToDepartmentId': 'user.departments.departmentId' } }
      },
      {
        name: 'Agents can update assigned tickets',
        description: 'Allow agents to write tickets assigned to them',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: agentRole.id,
        resource: 'tickets',
        action: 'write',
        conditions: { equals: { 'ticket.assignedTo': 'user.id' } }
      },
      {
        name: 'Users can read own tickets',
        description: 'Allow end users to read only tickets they submitted',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: userRole.id,
        resource: 'tickets',
        action: 'read',
        conditions: { equals: { 'ticket.submittedBy': 'user.id' } }
      },
      {
        name: 'Users can update own tickets (limited)',
        description: 'Allow end users to write tickets they submitted (e.g., add comments, details)',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: userRole.id,
        resource: 'tickets',
        action: 'write',
        conditions: { equals: { 'ticket.submittedBy': 'user.id' } }
      },
      {
        name: 'Managers can delete tickets in their department',
        description: 'Allow managers to delete tickets within their department scope',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: managerRole.id,
        resource: 'tickets',
        action: 'delete',
        conditions: { in: { 'ticket.assignedToDepartmentId': 'user.departments.departmentId' } }
      },
      {
        name: 'Admins can delete any tickets',
        description: 'Allow admins to delete any ticket',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: adminRole.id,
        resource: 'tickets',
        action: 'delete',
        conditions: null
      },
      {
        name: 'Internal comments visible to staff only',
        description: 'Agents and managers can read internal comments',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: agentRole.id,
        resource: 'comments',
        action: 'read',
        conditions: { equals: { 'comment.isInternal': true } }
      },
      {
        name: 'Internal comments visible to managers',
        description: 'Managers can read internal comments',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: managerRole.id,
        resource: 'comments',
        action: 'read',
        conditions: { equals: { 'comment.isInternal': true } }
      },
      {
        name: 'Public comments visible to involved users',
        description: 'End users can read non-internal comments on their tickets',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: userRole.id,
        resource: 'comments',
        action: 'read',
        conditions: { and: [ { equals: { 'comment.isInternal': false } }, { equals: { 'comment.ticket.submittedBy': 'user.id' } } ] }
      },
      {
        name: 'Agents can upload attachments',
        description: 'Agents can upload attachments to tickets',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: agentRole.id,
        resource: 'attachments',
        action: 'upload',
        conditions: null
      },
      {
        name: 'Managers can upload attachments',
        description: 'Managers can upload attachments to tickets',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: managerRole.id,
        resource: 'attachments',
        action: 'upload',
        conditions: null
      },
      {
        name: 'Knowledge write for staff',
        description: 'Agents and managers can write knowledge base',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: agentRole.id,
        resource: 'knowledge',
        action: 'write',
        conditions: null
      },
      {
        name: 'Knowledge write for managers',
        description: 'Managers can write knowledge base',
        effect: 'ALLOW',
        subjectType: 'ROLE',
        subjectId: managerRole.id,
        resource: 'knowledge',
        action: 'write',
        conditions: null
      }
    ];

    for (const p of policies) {
      const normalizedConditions = (p as any).conditions === null ? Prisma.DbNull : (p as any).conditions;
      await prisma.accessPolicy.upsert({
        where: { name: p.name },
        update: { description: p.description, effect: p.effect as any, subjectType: p.subjectType as any, subjectId: p.subjectId, resource: p.resource, action: p.action, conditions: normalizedConditions as any, isActive: true },
        create: { name: p.name, description: p.description, effect: p.effect as any, subjectType: p.subjectType as any, subjectId: p.subjectId, resource: p.resource, action: p.action, conditions: normalizedConditions as any, isActive: true }
      });
    }

    console.log('✅ RBAC & ABAC data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding RBAC/ABAC:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedRbacAbac()
    .then(() => {
      console.log('🎉 RBAC/ABAC seeding completed!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 RBAC/ABAC seeding failed:', err);
      process.exit(1);
    });
}

export { seedRbacAbac };

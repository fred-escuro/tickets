import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('password123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tickethub.com' },
    update: {},
    create: {
      firstName: 'John',
      lastName: 'Admin',
      email: 'admin@tickethub.com',
      password: adminPassword,
      
      isAgent: true,
      skills: {
        technical: ['System Administration', 'Database Management', 'Security'],
        soft: ['Leadership', 'Problem Solving', 'Communication']
      },
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    }
  });

  // Create support agents
  const agentPassword = await bcrypt.hash('password123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@tickethub.com' },
    update: {},
    create: {
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'manager@tickethub.com',
      password: agentPassword,
      
      isAgent: true,
      skills: {
        technical: ['Customer Support', 'Process Management', 'Analytics'],
        soft: ['Team Management', 'Strategic Thinking', 'Customer Relations']
      },
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    }
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@tickethub.com' },
    update: {},
    create: {
      firstName: 'Mike',
      lastName: 'Agent',
      email: 'agent@tickethub.com',
      password: agentPassword,
      
      isAgent: true,
      skills: {
        technical: ['Hardware Support', 'Software Troubleshooting', 'Network Issues'],
        soft: ['Customer Service', 'Technical Writing', 'Time Management']
      },
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    }
  });

  const developer = await prisma.user.upsert({
    where: { email: 'developer@tickethub.com' },
    update: {},
    create: {
      firstName: 'Emily',
      lastName: 'Developer',
      email: 'developer@tickethub.com',
      password: agentPassword,
      
      isAgent: true,
      skills: {
        technical: ['JavaScript', 'React', 'Node.js', 'Database Design'],
        soft: ['Code Review', 'Mentoring', 'Documentation']
      },
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
    }
  });

  // Create regular users
  const userPassword = await bcrypt.hash('password123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@tickethub.com' },
    update: {},
    create: {
      firstName: 'David',
      lastName: 'Customer',
      email: 'customer@tickethub.com',
      password: userPassword,
      
      isAgent: false,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@tickethub.com' },
    update: {},
    create: {
      firstName: 'Lisa',
      lastName: 'User',
      email: 'user@tickethub.com',
      password: userPassword,
      
      isAgent: false,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
    }
  });

  // Link users to roles
  const adminRole = await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin', description: 'System Administrator', isSystem: true } });
  const managerRole = await prisma.role.upsert({ where: { name: 'manager' }, update: {}, create: { name: 'manager', description: 'Team/Department Manager', isSystem: true } });
  const agentRole = await prisma.role.upsert({ where: { name: 'agent' }, update: {}, create: { name: 'agent', description: 'Support Agent', isSystem: true } });
  const userRole = await prisma.role.upsert({ where: { name: 'user' }, update: {}, create: { name: 'user', description: 'End User', isSystem: true } });

  const link = async (userId: string, roleId: string, isPrimary = false) => {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: { isPrimary },
      create: { userId, roleId, isPrimary }
    } as any);
  };

  await link(admin.id, adminRole.id, true);
  await link(manager.id, managerRole.id, true);
  await link(agent.id, agentRole.id, true);
  await link(developer.id, agentRole.id, true);
  await link(customer.id, userRole.id, true);
  await link(user.id, userRole.id, true);

  // Create sample tickets
  // Get default category, priority, and status IDs
  const defaultCategory = await prisma.ticketCategory.findFirst({ where: { name: 'Technical Support' } });
  const defaultPriority = await prisma.ticketPriority.findFirst({ where: { name: 'High' } });
  const defaultStatus = await prisma.ticketStatus.findFirst({ where: { name: 'Open' } });

  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Printer not working',
      description: 'The office printer is showing an error message and won\'t print any documents. Error code: E-04.',
      categoryId: defaultCategory?.id || 'default-category',
      priorityId: defaultPriority?.id || 'default-priority',
      statusId: defaultStatus?.id || 'default-status',
      submittedBy: customer.id,
      tags: ['printer', 'hardware', 'urgent']
    }
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Email access issues',
      description: 'I cannot access my email account. Getting "authentication failed" error when trying to log in.',
      categoryId: defaultCategory?.id || 'default-category',
      priorityId: defaultPriority?.id || 'default-priority',
      statusId: defaultStatus?.id || 'default-status',
      submittedBy: user.id,
      assignedTo: agent.id,
      assignedAt: new Date(),
      tags: ['email', 'authentication', 'software']
    }
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      title: 'WiFi connection problems',
      description: 'WiFi keeps disconnecting every few minutes. This is affecting my ability to work remotely.',
      categoryId: defaultCategory?.id || 'default-category',
      priorityId: defaultPriority?.id || 'default-priority',
      statusId: defaultStatus?.id || 'default-status',
      submittedBy: customer.id,
      tags: ['wifi', 'network', 'remote-work']
    }
  });

  // Create sample comments
  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: agent.id,
      content: 'I\'ve identified the issue. It appears to be related to the recent password policy update. I\'m working on a solution.',
      isInternal: false
    }
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: agent.id,
      content: 'Internal note: Need to check if this affects other users in the Sales department.',
      isInternal: true
    }
  });

  // Create sample knowledge base articles
  await prisma.knowledgeBase.create({
    data: {
      title: 'How to Reset Your Password',
      content: 'If you\'re having trouble accessing your account, follow these steps to reset your password...',
      category: 'account',
      tags: ['password', 'authentication', 'account'],
      authorId: agent.id
    }
  });

  await prisma.knowledgeBase.create({
    data: {
      title: 'Common Printer Issues and Solutions',
      content: 'This guide covers the most common printer problems and how to resolve them...',
      category: 'hardware',
      tags: ['printer', 'hardware', 'troubleshooting'],
      authorId: agent.id
    }
  });

  await prisma.knowledgeBase.create({
    data: {
      title: 'Setting Up VPN for Remote Work',
      content: 'Learn how to configure your VPN connection for secure remote access to company resources...',
      category: 'network',
      tags: ['vpn', 'remote-work', 'security'],
      authorId: manager.id
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`👥 Created ${await prisma.user.count()} users`);
  console.log(`🎫 Created ${await prisma.ticket.count()} tickets`);
  console.log(`💬 Created ${await prisma.comment.count()} comments`);
  console.log(`📚 Created ${await prisma.knowledgeBase.count()} knowledge base articles`);

  console.log('\n🔑 Default login credentials:');
  console.log('Admin: admin@tickethub.com / password123');
  console.log('Manager: manager@tickethub.com / password123');
  console.log('Agent: agent@tickethub.com / password123');
  console.log('Developer: developer@tickethub.com / password123');
  console.log('Customer: customer@tickethub.com / password123');
  console.log('User: user@tickethub.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

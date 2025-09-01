import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@company.com',
      password: adminPassword,
      role: 'admin',
      department: 'IT',
      isAgent: true,
      skills: ['System Administration', 'Security', 'Networking']
    }
  });

  // Create support agents
  const agentPassword = await bcrypt.hash('agent123', 12);
  const john = await prisma.user.upsert({
    where: { email: 'john.support@company.com' },
    update: {},
    create: {
      name: 'John Support',
      email: 'john.support@company.com',
      password: agentPassword,
      role: 'support_agent',
      department: 'IT Support',
      isAgent: true,
      skills: ['Network', 'Hardware', 'Software', 'Security']
    }
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah.tech@company.com' },
    update: {},
    create: {
      name: 'Sarah Tech',
      email: 'sarah.tech@company.com',
      password: agentPassword,
      role: 'support_agent',
      department: 'IT Support',
      isAgent: true,
      skills: ['Software', 'Database', 'Cloud', 'DevOps']
    }
  });

  const mike = await prisma.user.upsert({
    where: { email: 'mike.hardware@company.com' },
    update: {},
    create: {
      name: 'Mike Hardware',
      email: 'mike.hardware@company.com',
      password: agentPassword,
      role: 'support_agent',
      department: 'IT Support',
      isAgent: true,
      skills: ['Hardware', 'Peripherals', 'Maintenance']
    }
  });

  // Create regular users
  const userPassword = await bcrypt.hash('user123', 12);
  const alice = await prisma.user.upsert({
    where: { email: 'alice.user@company.com' },
    update: {},
    create: {
      name: 'Alice User',
      email: 'alice.user@company.com',
      password: userPassword,
      role: 'user',
      department: 'Marketing',
      isAgent: false
    }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob.employee@company.com' },
    update: {},
    create: {
      name: 'Bob Employee',
      email: 'bob.employee@company.com',
      password: userPassword,
      role: 'user',
      department: 'Sales',
      isAgent: false
    }
  });

  // Create sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Printer not working',
      description: 'The office printer is showing an error message and won\'t print any documents. Error code: E-04.',
      category: 'hardware',
      priority: 'HIGH',
      status: 'OPEN',
      submittedBy: alice.id,
      tags: ['printer', 'hardware', 'urgent']
    }
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Email access issues',
      description: 'I cannot access my email account. Getting "authentication failed" error when trying to log in.',
      category: 'software',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      submittedBy: bob.id,
      assignedTo: john.id,
      assignedAt: new Date(),
      tags: ['email', 'authentication', 'software']
    }
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      title: 'WiFi connection problems',
      description: 'WiFi keeps disconnecting every few minutes. This is affecting my ability to work remotely.',
      category: 'network',
      priority: 'HIGH',
      status: 'OPEN',
      submittedBy: alice.id,
      tags: ['wifi', 'network', 'remote-work']
    }
  });

  // Create sample comments
  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: john.id,
      content: 'I\'ve identified the issue. It appears to be related to the recent password policy update. I\'m working on a solution.',
      isInternal: false
    }
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: john.id,
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
      authorId: john.id
    }
  });

  await prisma.knowledgeBase.create({
    data: {
      title: 'Common Printer Issues and Solutions',
      content: 'This guide covers the most common printer problems and how to resolve them...',
      category: 'hardware',
      tags: ['printer', 'hardware', 'troubleshooting'],
      authorId: mike.id
    }
  });

  await prisma.knowledgeBase.create({
    data: {
      title: 'Setting Up VPN for Remote Work',
      content: 'Learn how to configure your VPN connection for secure remote access to company resources...',
      category: 'network',
      tags: ['vpn', 'remote-work', 'security'],
      authorId: sarah.id
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`👥 Created ${await prisma.user.count()} users`);
  console.log(`🎫 Created ${await prisma.ticket.count()} tickets`);
  console.log(`💬 Created ${await prisma.comment.count()} comments`);
  console.log(`📚 Created ${await prisma.knowledgeBase.count()} knowledge base articles`);

  console.log('\n🔑 Default login credentials:');
  console.log('Admin: admin@company.com / admin123');
  console.log('Agent: john.support@company.com / agent123');
  console.log('User: alice.user@company.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAutoResponseTemplates() {
  console.log('🌱 Seeding auto-response templates...');

  try {
    // Get departments for association
    const departments = await prisma.department.findMany();
    const billingDept = departments.find(d => d.name === 'Billing');
    const itSupportDept = departments.find(d => d.name === 'IT Support');

    // Get the first user for creator association
    const firstUser = await prisma.user.findFirst();
    const createdBy = firstUser?.id;

    // Default templates
    const templates = [
      {
        name: 'Welcome - New Ticket',
        description: 'Welcome message for new tickets created via email',
        subjectTemplate: 'Re: {{ticketTitle}} - Ticket {{ticketNumber}}',
        bodyTemplate: `Dear {{submitterName}},

Thank you for contacting {{companyName}} support. We have received your request and created ticket {{ticketNumber}} for you.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{ticketPriority}}
- Category: {{ticketCategory}}
- Status: {{ticketStatus}}

Our support team will review your request and respond within {{estimatedResponseTime}}. You can track the progress of your ticket by replying to this email.

If you have any additional information or questions, please reply to this email and we'll add it to your ticket.

Best regards,
{{companyName}} Support Team

---
This is an automated response. Please do not reply to this email directly.`,
        triggerConditions: {
          categories: [], // Apply to all categories
          priorities: [], // Apply to all priorities
          statuses: [], // Apply to all statuses
          sources: ['EMAIL'], // Only for email-created tickets
        },
        departmentId: null, // Global template
        isActive: true,
        createdBy,
      },
      {
        name: 'High Priority - Urgent',
        description: 'Special response for high priority tickets',
        subjectTemplate: 'URGENT: {{ticketTitle}} - Ticket {{ticketNumber}}',
        bodyTemplate: `Dear {{submitterName}},

We have received your **URGENT** request and created ticket {{ticketNumber}} with high priority.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{ticketPriority}} ⚠️
- Category: {{ticketCategory}}
- Status: {{ticketStatus}}

Due to the high priority of your request, our support team will respond within 2 hours during business hours.

**What happens next:**
1. Our team will review your request immediately
2. We'll assign it to the most appropriate specialist
3. You'll receive updates as we work on your issue

If this is a critical system issue, please also call us at {{supportPhone}}.

Best regards,
{{companyName}} Support Team

---
This is an automated response. Please do not reply to this email directly.`,
        triggerConditions: {
          priorities: [], // Will be set to high priority IDs
          sources: ['EMAIL'],
        },
        departmentId: null, // Global template
        isActive: true,
        createdBy,
      },
      {
        name: 'Technical Support',
        description: 'Response for technical support tickets',
        subjectTemplate: 'Technical Support - {{ticketTitle}} - Ticket {{ticketNumber}}',
        bodyTemplate: `Dear {{submitterName}},

Thank you for contacting our Technical Support team. We have received your technical inquiry and created ticket {{ticketNumber}}.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{ticketPriority}}
- Category: {{ticketCategory}}
- Status: {{ticketStatus}}

**Next Steps:**
Our technical team will:
1. Review your request within {{estimatedResponseTime}}
2. Gather any additional information needed
3. Provide a detailed technical response
4. Follow up until your issue is resolved

**To help us assist you better:**
- Please include any error messages you're seeing
- Describe the steps you've already tried
- Let us know if this is affecting multiple users

You can track your ticket progress by replying to this email.

Best regards,
{{companyName}} Technical Support Team

---
This is an automated response. Please do not reply to this email directly.`,
        triggerConditions: {
          categories: [], // Will be set to technical category IDs
          sources: ['EMAIL'],
        },
        departmentId: itSupportDept?.id, // IT Support department
        isActive: true,
        createdBy,
      },
      {
        name: 'Account Support',
        description: 'Response for account-related tickets',
        subjectTemplate: 'Account Support - {{ticketTitle}} - Ticket {{ticketNumber}}',
        bodyTemplate: `Dear {{submitterName}},

Thank you for contacting our Account Support team regarding your account inquiry. We have created ticket {{ticketNumber}} for you.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{ticketPriority}}
- Category: {{ticketCategory}}
- Status: {{ticketStatus}}

**Account Support Services:**
- Password resets and account access issues
- Billing and subscription questions
- Account settings and preferences
- User permissions and roles

Our account support team will review your request and respond within {{estimatedResponseTime}}.

**Security Note:** For account security, we may need to verify your identity before making any changes to your account.

Best regards,
{{companyName}} Account Support Team

---
This is an automated response. Please do not reply to this email directly.`,
        triggerConditions: {
          categories: [], // Will be set to account category IDs
          sources: ['EMAIL'],
        },
        departmentId: billingDept?.id, // Billing department
        isActive: true,
        createdBy,
      },
    ];

    // Create templates
    for (const templateData of templates) {
      const existing = await prisma.autoResponseTemplate.findFirst({
        where: { name: templateData.name },
      });

      if (!existing) {
        await prisma.autoResponseTemplate.create({
          data: templateData,
        });
        console.log(`✅ Created template: ${templateData.name}`);
      } else {
        console.log(`⏭️  Template already exists: ${templateData.name}`);
      }
    }

    // Enable auto-response system
    await prisma.appSetting.upsert({
      where: {
        namespace_key: {
          namespace: 'auto_response',
          key: 'enabled',
        },
      },
      update: {
        value: true,
        description: 'Enable/disable auto-response system',
      },
      create: {
        namespace: 'auto_response',
        key: 'enabled',
        value: true,
        description: 'Enable/disable auto-response system',
      },
    });

    console.log('✅ Auto-response system enabled');
    console.log('🎉 Auto-response templates seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding auto-response templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  seedAutoResponseTemplates()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedAutoResponseTemplates };

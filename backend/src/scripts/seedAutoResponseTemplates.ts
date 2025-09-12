import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAutoResponseTemplates() {
  console.log('🌱 Seeding auto-response templates...');

  // Get the first department (or create a default one)
  let defaultDepartment = await prisma.department.findFirst();
  if (!defaultDepartment) {
    defaultDepartment = await prisma.department.create({
      data: {
        name: 'General Support',
        description: 'Default support department',
        autoAssignEnabled: true,
        assignmentStrategy: 'round_robin',
        maxTicketsPerAgent: 10
      }
    });
  }

  // Get the first user (or create a default one)
  let defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    defaultUser = await prisma.user.create({
      data: {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@tickethub.com',
        password: 'hashed_password_here', // This should be properly hashed
        isAgent: true,
        maxConcurrentTickets: 10,
        assignmentPriority: 1,
        isAvailable: true
      }
    });
  }

  // Create default auto-response templates
  const templates = [
    {
      name: 'New Ticket Confirmation',
      description: 'Standard confirmation email sent when a new ticket is created',
      subjectTemplate: 'Re: {{ticketTitle}} - Ticket #{{ticketNumber}}',
      bodyTemplate: `Thank you for contacting our support team. We have received your ticket and will review it shortly.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{priority}}
- Category: {{category}}

{{#includeOriginalContent}}
**Original Message:**
{{originalContent}}
{{/includeOriginalContent}}

Our support team will get back to you as soon as possible. You can track the progress of your ticket by logging into our support portal.

Best regards,
Support Team`,
      triggerConditions: {
        type: 'new_ticket',
        conditions: {
          source: ['email', 'web'],
          priority: ['low', 'medium', 'high', 'critical']
        }
      },
      departmentId: defaultDepartment.id,
      isActive: true,
      createdBy: defaultUser.id
    },
    {
      name: 'High Priority Ticket Alert',
      description: 'Special confirmation for high priority tickets',
      subjectTemplate: 'URGENT: {{ticketTitle}} - Ticket #{{ticketNumber}}',
      bodyTemplate: `Thank you for contacting our support team. We have received your **URGENT** ticket and our team is prioritizing it for immediate attention.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{priority}} (**URGENT**)
- Category: {{category}}

{{#includeOriginalContent}}
**Original Message:**
{{originalContent}}
{{/includeOriginalContent}}

Our support team will respond to your urgent request within 2 hours during business hours. If this is a critical issue outside business hours, please call our emergency support line.

Best regards,
Support Team`,
      triggerConditions: {
        type: 'new_ticket',
        conditions: {
          priority: ['high', 'critical'],
          source: ['email', 'web']
        }
      },
      departmentId: defaultDepartment.id,
      isActive: true,
      createdBy: defaultUser.id
    },
    {
      name: 'Follow-up Reminder',
      description: 'Reminder email for tickets that need follow-up',
      subjectTemplate: 'Follow-up Required: {{ticketTitle}} - Ticket #{{ticketNumber}}',
      bodyTemplate: `Hello,

We wanted to follow up on your ticket to ensure we're addressing your needs properly.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{priority}}
- Category: {{category}}

{{#includeOriginalContent}}
**Original Message:**
{{originalContent}}
{{/includeOriginalContent}}

Please let us know if you need any additional assistance or if your issue has been resolved. We're here to help!

Best regards,
Support Team`,
      triggerConditions: {
        type: 'followup',
        conditions: {
          status: ['open', 'in_progress'],
          daysSinceLastUpdate: 3
        }
      },
      departmentId: defaultDepartment.id,
      isActive: true,
      createdBy: defaultUser.id
    },
    {
      name: 'Resolution Confirmation',
      description: 'Confirmation email when a ticket is marked as resolved',
      subjectTemplate: 'Resolved: {{ticketTitle}} - Ticket #{{ticketNumber}}',
      bodyTemplate: `Hello,

We're pleased to inform you that your ticket has been **resolved**.

**Ticket Details:**
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{priority}}
- Category: {{category}}

**Resolution:** {{resolution}}

{{#includeOriginalContent}}
**Original Message:**
{{originalContent}}
{{/includeOriginalContent}}

If you have any questions about the resolution or need further assistance, please don't hesitate to contact us. We appreciate your patience and look forward to serving you again.

Best regards,
Support Team`,
      triggerConditions: {
        type: 'status_change',
        conditions: {
          newStatus: 'resolved',
          previousStatus: ['open', 'in_progress']
        }
      },
      departmentId: defaultDepartment.id,
      isActive: true,
      createdBy: defaultUser.id
    }
  ];

  // Create the templates
  for (const template of templates) {
    // Check if template already exists
    const existingTemplate = await prisma.autoResponseTemplate.findFirst({
      where: { name: template.name }
    });

    if (existingTemplate) {
      // Update existing template
      await prisma.autoResponseTemplate.update({
        where: { id: existingTemplate.id },
        data: template
      });
    } else {
      // Create new template
      await prisma.autoResponseTemplate.create({
        data: template
      });
    }
  }

  console.log(`✅ Created ${templates.length} auto-response templates`);
}

async function seedFollowupManagementSettings() {
  console.log('🌱 Seeding followup management settings...');

  // Followup management settings
  const followupSettings = [
    {
      namespace: 'followup',
      key: 'enabled',
      value: true,
      description: 'Enable automatic follow-up management'
    },
    {
      namespace: 'followup',
      key: 'default_delay_hours',
      value: 72,
      description: 'Default delay before sending follow-up emails (in hours)'
    },
    {
      namespace: 'followup',
      key: 'max_followups_per_ticket',
      value: 3,
      description: 'Maximum number of follow-up emails per ticket'
    },
    {
      namespace: 'followup',
      key: 'escalation_delay_hours',
      value: 168, // 7 days
      description: 'Delay before escalating tickets without response (in hours)'
    },
    {
      namespace: 'followup',
      key: 'auto_close_delay_hours',
      value: 720, // 30 days
      description: 'Delay before auto-closing tickets without response (in hours)'
    },
    {
      namespace: 'followup',
      key: 'business_hours_only',
      value: true,
      description: 'Only send follow-ups during business hours'
    },
    {
      namespace: 'followup',
      key: 'exclude_weekends',
      value: true,
      description: 'Exclude weekends from follow-up calculations'
    },
    {
      namespace: 'followup',
      key: 'exclude_holidays',
      value: true,
      description: 'Exclude holidays from follow-up calculations'
    },
    {
      namespace: 'followup',
      key: 'priority_multipliers',
      value: {
        low: 1.0,
        medium: 0.8,
        high: 0.5,
        critical: 0.25
      },
      description: 'Multipliers for follow-up delays based on priority'
    },
    {
      namespace: 'followup',
      key: 'category_rules',
      value: {
        'technical_support': { delay_hours: 48, max_followups: 5 },
        'billing': { delay_hours: 24, max_followups: 2 },
        'general_inquiry': { delay_hours: 72, max_followups: 3 }
      },
      description: 'Category-specific follow-up rules'
    },
    {
      namespace: 'followup',
      key: 'escalation_rules',
      value: {
        enabled: true,
        levels: [
          { delay_hours: 168, action: 'notify_manager' },
          { delay_hours: 336, action: 'notify_director' },
          { delay_hours: 504, action: 'notify_executive' }
        ]
      },
      description: 'Escalation rules for overdue tickets'
    },
    {
      namespace: 'followup',
      key: 'auto_response_rules',
      value: {
        enabled: true,
        include_original_content: true,
        include_ticket_details: true,
        include_support_portal_link: true,
        include_escalation_info: true
      },
      description: 'Rules for auto-response content'
    }
  ];

  // Insert followup settings
  for (const setting of followupSettings) {
    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: setting.namespace, key: setting.key } },
      update: {
        value: setting.value,
        description: setting.description,
        updatedAt: new Date()
      },
      create: {
        namespace: setting.namespace,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        type: 'JSON',
        isSecret: false
      }
    });
  }

  console.log(`✅ Created ${followupSettings.length} followup management settings`);
}

async function seedEmailResponseSettings() {
  console.log('🌱 Seeding email response settings...');

  const emailResponseSettings = [
    {
      namespace: 'email.responses',
      key: 'include_original_content',
      value: true,
      description: 'Include original email content in responses'
    },
    {
      namespace: 'email.responses',
      key: 'include_all_recipients',
      value: false,
      description: 'Include all original recipients in responses'
    },
    {
      namespace: 'email.responses',
      key: 'include_cc_recipients',
      value: true,
      description: 'Include CC recipients in responses'
    },
    {
      namespace: 'email.responses',
      key: 'include_bcc_recipients',
      value: false,
      description: 'Include BCC recipients in responses'
    },
    {
      namespace: 'email.responses',
      key: 'max_content_length',
      value: 5000,
      description: 'Maximum length of email content to include'
    },
    {
      namespace: 'email.responses',
      key: 'truncate_long_content',
      value: true,
      description: 'Truncate long email content in responses'
    },
    {
      namespace: 'email.responses',
      key: 'include_attachments_info',
      value: true,
      description: 'Include attachment information in responses'
    },
    {
      namespace: 'email.responses',
      key: 'signature_template',
      value: `Best regards,
Support Team

---
This is an automated response. Please do not reply to this email directly.`,
      description: 'Default signature for auto-responses'
    }
  ];

  // Insert email response settings
  for (const setting of emailResponseSettings) {
    await prisma.appSetting.upsert({
      where: { namespace_key: { namespace: setting.namespace, key: setting.key } },
      update: {
        value: setting.value,
        description: setting.description,
        updatedAt: new Date()
      },
      create: {
        namespace: setting.namespace,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        type: 'JSON',
        isSecret: false
      }
    });
  }

  console.log(`✅ Created ${emailResponseSettings.length} email response settings`);
}

async function main() {
  try {
    await seedAutoResponseTemplates();
    await seedFollowupManagementSettings();
    await seedEmailResponseSettings();
    
    console.log('🎉 Successfully seeded auto-response templates and followup management settings!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

export async function seedAutoResponseData() {
  await main();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
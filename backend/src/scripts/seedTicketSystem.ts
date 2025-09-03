import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTicketSystem() {
  console.log('🌱 Seeding ticket system data...');

  try {
    // Create default ticket categories
    const categories = await Promise.all([
      prisma.ticketCategory.upsert({
        where: { name: 'Technical Support' },
        update: {},
        create: {
          name: 'Technical Support',
          description: 'Hardware and software issues',
          color: 'blue',
          icon: 'wrench',
          sortOrder: 1,
          customFields: {
            fields: [
              {
                id: 'device_type',
                label: 'Device Type',
                type: 'select',
                required: true,
                options: ['Desktop', 'Laptop', 'Mobile', 'Tablet', 'Server']
              },
              {
                id: 'operating_system',
                label: 'Operating System',
                type: 'select',
                required: false,
                options: ['Windows', 'macOS', 'Linux', 'iOS', 'Android']
              }
            ]
          },
          autoAssignRules: {
            rules: [
              {
                condition: 'device_type === "Server"',
                assignTo: 'server-admin'
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.upsert({
        where: { name: 'Billing' },
        update: {},
        create: {
          name: 'Billing',
          description: 'Payment and subscription issues',
          color: 'green',
          icon: 'credit-card',
          sortOrder: 2,
          customFields: {
            fields: [
              {
                id: 'invoice_number',
                label: 'Invoice Number',
                type: 'text',
                required: true
              },
              {
                id: 'payment_method',
                label: 'Payment Method',
                type: 'select',
                required: false,
                options: ['Credit Card', 'Bank Transfer', 'PayPal', 'Other']
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.upsert({
        where: { name: 'Feature Request' },
        update: {},
        create: {
          name: 'Feature Request',
          description: 'New feature suggestions',
          color: 'purple',
          icon: 'lightbulb',
          sortOrder: 3,
          customFields: {
            fields: [
              {
                id: 'feature_area',
                label: 'Feature Area',
                type: 'select',
                required: true,
                options: ['UI/UX', 'Backend', 'Mobile App', 'API', 'Integration']
              },
              {
                id: 'business_impact',
                label: 'Business Impact',
                type: 'select',
                required: true,
                options: ['High', 'Medium', 'Low']
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.upsert({
        where: { name: 'Bug Report' },
        update: {},
        create: {
          name: 'Bug Report',
          description: 'System bugs and errors',
          color: 'red',
          icon: 'bug',
          sortOrder: 4,
          customFields: {
            fields: [
              {
                id: 'browser',
                label: 'Browser',
                type: 'select',
                required: false,
                options: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other']
              },
              {
                id: 'steps_to_reproduce',
                label: 'Steps to Reproduce',
                type: 'textarea',
                required: true
              }
            ]
          }
        }
      })
    ]);

    // Create subcategories for Technical Support
    await Promise.all([
      prisma.ticketCategory.upsert({
        where: { name: 'Hardware Issues' },
        update: {},
        create: {
          name: 'Hardware Issues',
          description: 'Physical hardware problems',
          color: 'orange',
          icon: 'cpu',
          parentId: categories[0].id,
          sortOrder: 1
        }
      }),
      prisma.ticketCategory.upsert({
        where: { name: 'Software Issues' },
        update: {},
        create: {
          name: 'Software Issues',
          description: 'Software and application problems',
          color: 'blue',
          icon: 'monitor',
          parentId: categories[0].id,
          sortOrder: 2
        }
      }),
      prisma.ticketCategory.upsert({
        where: { name: 'Network Issues' },
        update: {},
        create: {
          name: 'Network Issues',
          description: 'Connectivity and network problems',
          color: 'green',
          icon: 'wifi',
          parentId: categories[0].id,
          sortOrder: 3
        }
      })
    ]);

    // Create default ticket priorities
    const priorities = await Promise.all([
      prisma.ticketPriority.upsert({
        where: { name: 'Low' },
        update: {},
        create: {
          name: 'Low',
          description: 'Non-urgent issues that can be addressed during normal business hours',
          color: 'green',
          icon: 'arrow-down',
          level: 1,
          sortOrder: 1,
          slaResponseHours: 72,
          slaResolveHours: 168, // 1 week
          escalationRules: {
            rules: [
              {
                condition: 'hours_since_created > 72',
                action: 'notify_manager'
              }
            ]
          }
        }
      }),
      prisma.ticketPriority.upsert({
        where: { name: 'Medium' },
        update: {},
        create: {
          name: 'Medium',
          description: 'Standard priority issues requiring timely attention',
          color: 'yellow',
          icon: 'minus',
          level: 3,
          sortOrder: 2,
          slaResponseHours: 24,
          slaResolveHours: 72,
          escalationRules: {
            rules: [
              {
                condition: 'hours_since_created > 24',
                action: 'escalate_priority'
              }
            ]
          }
        }
      }),
      prisma.ticketPriority.upsert({
        where: { name: 'High' },
        update: {},
        create: {
          name: 'High',
          description: 'Important issues affecting productivity or business operations',
          color: 'orange',
          icon: 'arrow-up',
          level: 7,
          sortOrder: 3,
          slaResponseHours: 8,
          slaResolveHours: 24,
          escalationRules: {
            rules: [
              {
                condition: 'hours_since_created > 8',
                action: 'escalate_to_manager'
              },
              {
                condition: 'hours_since_created > 16',
                action: 'notify_director'
              }
            ]
          }
        }
      }),
      prisma.ticketPriority.upsert({
        where: { name: 'Critical' },
        update: {},
        create: {
          name: 'Critical',
          description: 'Urgent issues requiring immediate attention',
          color: 'red',
          icon: 'alert-triangle',
          level: 10,
          sortOrder: 4,
          slaResponseHours: 2,
          slaResolveHours: 8,
          escalationRules: {
            rules: [
              {
                condition: 'hours_since_created > 1',
                action: 'escalate_to_manager'
              },
              {
                condition: 'hours_since_created > 2',
                action: 'notify_director'
              },
              {
                condition: 'hours_since_created > 4',
                action: 'notify_executive'
              }
            ]
          }
        }
      })
    ]);

    // Create default ticket statuses
    const statuses = await Promise.all([
      prisma.ticketStatus.upsert({
        where: { name: 'Open' },
        update: {},
        create: {
          name: 'Open',
          description: 'New ticket awaiting assignment',
          color: 'blue',
          icon: 'circle',
          sortOrder: 1,
          isClosed: false,
          isResolved: false,
          allowedTransitions: {
            transitions: ['In Progress', 'Pending', 'Cancelled']
          },
          permissions: {
            roles: ['admin', 'manager', 'agent']
          }
        }
      }),
      prisma.ticketStatus.upsert({
        where: { name: 'In Progress' },
        update: {},
        create: {
          name: 'In Progress',
          description: 'Ticket is being actively worked on',
          color: 'yellow',
          icon: 'clock',
          sortOrder: 2,
          isClosed: false,
          isResolved: false,
          allowedTransitions: {
            transitions: ['Pending', 'Resolved', 'Escalated']
          },
          permissions: {
            roles: ['admin', 'manager', 'agent']
          }
        }
      }),
      prisma.ticketStatus.upsert({
        where: { name: 'Pending' },
        update: {},
        create: {
          name: 'Pending',
          description: 'Waiting for customer response or external dependency',
          color: 'orange',
          icon: 'pause',
          sortOrder: 3,
          isClosed: false,
          isResolved: false,
          allowedTransitions: {
            transitions: ['In Progress', 'Resolved', 'Closed']
          },
          permissions: {
            roles: ['admin', 'manager', 'agent']
          }
        }
      }),
      prisma.ticketStatus.upsert({
        where: { name: 'Resolved' },
        update: {},
        create: {
          name: 'Resolved',
          description: 'Issue has been resolved, awaiting customer confirmation',
          color: 'green',
          icon: 'check-circle',
          sortOrder: 4,
          isClosed: false,
          isResolved: true,
          allowedTransitions: {
            transitions: ['Closed', 'Reopened']
          },
          permissions: {
            roles: ['admin', 'manager', 'agent']
          }
        }
      }),
      prisma.ticketStatus.upsert({
        where: { name: 'Closed' },
        update: {},
        create: {
          name: 'Closed',
          description: 'Ticket has been closed and completed',
          color: 'gray',
          icon: 'x-circle',
          sortOrder: 5,
          isClosed: true,
          isResolved: true,
          allowedTransitions: {
            transitions: ['Reopened']
          },
          permissions: {
            roles: ['admin', 'manager']
          }
        }
      }),
      prisma.ticketStatus.upsert({
        where: { name: 'Escalated' },
        update: {},
        create: {
          name: 'Escalated',
          description: 'Ticket has been escalated to higher level support',
          color: 'red',
          icon: 'arrow-up',
          sortOrder: 6,
          isClosed: false,
          isResolved: false,
          allowedTransitions: {
            transitions: ['In Progress', 'Resolved']
          },
          permissions: {
            roles: ['admin', 'manager']
          }
        }
      }),
      prisma.ticketStatus.upsert({
        where: { name: 'Cancelled' },
        update: {},
        create: {
          name: 'Cancelled',
          description: 'Ticket has been cancelled',
          color: 'gray',
          icon: 'x',
          sortOrder: 7,
          isClosed: true,
          isResolved: false,
          allowedTransitions: {
            transitions: ['Reopened']
          },
          permissions: {
            roles: ['admin', 'manager', 'agent']
          }
        }
      })
    ]);

    // Create default ticket templates
    await Promise.all([
      prisma.ticketTemplate.upsert({
        where: { name: 'Hardware Issue Template' },
        update: {},
        create: {
          name: 'Hardware Issue Template',
          description: 'Template for hardware-related issues',
          categoryId: categories[0].id, // Technical Support
          title: 'Hardware Issue: [Device Type]',
          templateDescription: 'Please describe the hardware issue you are experiencing.',
          customFields: {
            device_type: 'Desktop',
            operating_system: 'Windows'
          }
        }
      }),
      prisma.ticketTemplate.upsert({
        where: { name: 'Billing Inquiry Template' },
        update: {},
        create: {
          name: 'Billing Inquiry Template',
          description: 'Template for billing-related inquiries',
          categoryId: categories[1].id, // Billing
          title: 'Billing Inquiry',
          templateDescription: 'Please describe your billing question or issue.',
          customFields: {
            invoice_number: '',
            payment_method: 'Credit Card'
          }
        }
      })
    ]);

    // Create default workflows
    await Promise.all([
      prisma.ticketWorkflow.upsert({
        where: { name: 'Auto-Assignment Workflow' },
        update: {},
        create: {
          name: 'Auto-Assignment Workflow',
          description: 'Automatically assigns tickets based on category and priority',
          rules: {
            triggers: [
              {
                event: 'ticket_created',
                conditions: [
                  {
                    field: 'category.name',
                    operator: 'equals',
                    value: 'Technical Support'
                  }
                ],
                actions: [
                  {
                    type: 'assign_to_agent',
                    value: 'auto_assign_by_workload'
                  },
                  {
                    type: 'set_sla',
                    value: 'category_priority_based'
                  }
                ]
              }
            ]
          }
        }
      }),
      prisma.ticketWorkflow.upsert({
        where: { name: 'Escalation Workflow' },
        update: {},
        create: {
          name: 'Escalation Workflow',
          description: 'Automatically escalates tickets based on SLA breaches',
          rules: {
            triggers: [
              {
                event: 'sla_breach',
                conditions: [
                  {
                    field: 'priority.level',
                    operator: '>=',
                    value: 7
                  }
                ],
                actions: [
                  {
                    type: 'escalate_priority',
                    value: 'increase_by_one'
                  },
                  {
                    type: 'notify_manager',
                    value: 'immediate'
                  },
                  {
                    type: 'add_comment',
                    value: 'Ticket automatically escalated due to SLA breach'
                  }
                ]
              }
            ]
          }
        }
      })
    ]);

    console.log('✅ Ticket system data seeded successfully!');
    console.log(`📁 Created ${categories.length} categories`);
    console.log(`⚡ Created ${priorities.length} priorities`);
    console.log(`📊 Created ${statuses.length} statuses`);

  } catch (error) {
    console.error('❌ Error seeding ticket system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedTicketSystem()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedTicketSystem };

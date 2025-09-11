import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAndSeed() {
  console.log('🔄 Resetting database and seeding with enhanced ticket system...');

  try {
    // Clear all existing data
    console.log('🗑️  Clearing existing data...');
    
    // Delete in correct order to respect foreign key constraints
    await prisma.ticketStatusHistory.deleteMany();
    await prisma.ticketEvent.deleteMany();
    await prisma.ticketTask.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.ticketWorkflow.deleteMany();
    await prisma.ticketTemplate.deleteMany();
    await prisma.ticketStatus.deleteMany();
    await prisma.ticketPriority.deleteMany();
    await prisma.ticketCategory.deleteMany();
    await prisma.knowledgeBase.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Database cleared successfully');

    // Create users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await Promise.all([
      prisma.user.create({
        data: {
          firstName: 'John',
          lastName: 'Admin',
          email: 'admin@tickethub.com',
          password: hashedPassword,
          isAgent: true,
          skills: {
            technical: ['System Administration', 'Database Management', 'Security'],
            soft: ['Leadership', 'Problem Solving', 'Communication']
          },
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        }
      }),
      prisma.user.create({
        data: {
          firstName: 'Sarah',
          lastName: 'Manager',
          email: 'manager@tickethub.com',
          password: hashedPassword,
          isAgent: true,
          skills: {
            technical: ['Customer Support', 'Process Management', 'Analytics'],
            soft: ['Team Management', 'Strategic Thinking', 'Customer Relations']
          },
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
        }
      }),
      prisma.user.create({
        data: {
          firstName: 'Mike',
          lastName: 'Agent',
          email: 'agent@tickethub.com',
          password: hashedPassword,
          isAgent: true,
          skills: {
            technical: ['Hardware Support', 'Software Troubleshooting', 'Network Issues'],
            soft: ['Customer Service', 'Technical Writing', 'Time Management']
          },
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        }
      }),
      prisma.user.create({
        data: {
          firstName: 'Emily',
          lastName: 'Developer',
          email: 'developer@tickethub.com',
          password: hashedPassword,
          isAgent: true,
          skills: {
            technical: ['JavaScript', 'React', 'Node.js', 'Database Design'],
            soft: ['Code Review', 'Mentoring', 'Documentation']
          },
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
        }
      }),
      prisma.user.create({
        data: {
          firstName: 'David',
          lastName: 'Customer',
          email: 'customer@tickethub.com',
          password: hashedPassword,
          isAgent: false,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
        }
      }),
      prisma.user.create({
        data: {
          firstName: 'Lisa',
          lastName: 'User',
          email: 'user@tickethub.com',
          password: hashedPassword,
          isAgent: false,
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
        }
      })
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Assign roles to users
    console.log('🔐 Assigning roles to users...');
    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map(r => [r.name, r.id]));
    
    const roleAssignments = [
      { userIndex: 0, roleName: 'admin' },    // John Admin
      { userIndex: 1, roleName: 'manager' },  // Sarah Manager
      { userIndex: 2, roleName: 'agent' },    // Mike Agent
      { userIndex: 3, roleName: 'agent' },    // Emily Developer
      { userIndex: 4, roleName: 'user' },     // David Customer
      { userIndex: 5, roleName: 'user' }      // Lisa User
    ];
    
    for (const assignment of roleAssignments) {
      const user = users[assignment.userIndex];
      const roleId = roleMap.get(assignment.roleName);
      
      if (user && roleId) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleId,
            isPrimary: true
          }
        });
      }
    }
    
    console.log('✅ Roles assigned to users');

    // Assign users to multiple departments
    console.log('🏢 Assigning users to departments...');
    const departments = await prisma.department.findMany();
    const departmentMap = new Map(departments.map(d => [d.name, d.id]));
    
    // Define department assignments for each user
    const departmentAssignments = [
      { userIndex: 0, departments: ['IT Support', 'Management'], primary: 'IT Support' }, // John Admin
      { userIndex: 1, departments: ['Customer Support', 'Management'], primary: 'Management' }, // Sarah Manager
      { userIndex: 2, departments: ['IT Support', 'Customer Support'], primary: 'IT Support' }, // Mike Agent
      { userIndex: 3, departments: ['IT Support', 'Development'], primary: 'Development' }, // Emily Developer
      { userIndex: 4, departments: ['Customer Support'], primary: 'Customer Support' }, // David Customer
      { userIndex: 5, departments: ['Customer Support'], primary: 'Customer Support' } // Lisa User
    ];
    
    for (const assignment of departmentAssignments) {
      const user = users[assignment.userIndex];
      
      for (const deptName of assignment.departments) {
        const departmentId = departmentMap.get(deptName);
        
        if (user && departmentId) {
          await prisma.userDepartment.create({
            data: {
              userId: user.id,
              departmentId: departmentId,
              isPrimary: deptName === assignment.primary,
              role: assignment.userIndex === 0 ? 'admin' : 
                    assignment.userIndex === 1 ? 'manager' : 
                    assignment.userIndex === 2 || assignment.userIndex === 3 ? 'specialist' : 'member'
            }
          });
        }
      }
    }
    
    console.log('✅ Users assigned to departments');

    // Create ticket categories
    console.log('📁 Creating ticket categories...');
    const categories = await Promise.all([
      prisma.ticketCategory.create({
        data: {
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
              },
              {
                id: 'error_frequency',
                label: 'Error Frequency',
                type: 'select',
                required: false,
                options: ['First Time', 'Occasional', 'Frequent', 'Constant']
              }
            ]
          },
          autoAssignRules: {
            rules: [
              {
                condition: 'device_type === "Server"',
                assignTo: 'admin'
              },
              {
                condition: 'operating_system === "Linux"',
                assignTo: 'developer'
              }
            ]
          },
          slaRules: {
            rules: [
              {
                condition: 'device_type === "Server"',
                responseHours: 2,
                resolveHours: 8
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.create({
        data: {
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
                required: true,
                placeholder: 'Enter invoice number'
              },
              {
                id: 'payment_method',
                label: 'Payment Method',
                type: 'select',
                required: false,
                options: ['Credit Card', 'Bank Transfer', 'PayPal', 'Other']
              },
              {
                id: 'amount',
                label: 'Amount',
                type: 'number',
                required: false,
                validation: {
                  min: 0
                }
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.create({
        data: {
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
                options: ['UI/UX', 'Backend', 'Mobile App', 'API', 'Integration', 'Performance']
              },
              {
                id: 'business_impact',
                label: 'Business Impact',
                type: 'select',
                required: true,
                options: ['High', 'Medium', 'Low']
              },
              {
                id: 'user_story',
                label: 'User Story',
                type: 'textarea',
                required: false,
                placeholder: 'As a user, I want...'
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.create({
        data: {
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
                required: true,
                placeholder: '1. Go to...\n2. Click on...\n3. See error...'
              },
              {
                id: 'expected_behavior',
                label: 'Expected Behavior',
                type: 'textarea',
                required: true,
                placeholder: 'What should happen?'
              },
              {
                id: 'actual_behavior',
                label: 'Actual Behavior',
                type: 'textarea',
                required: true,
                placeholder: 'What actually happens?'
              }
            ]
          }
        }
      })
    ]);

    // Create subcategories for Technical Support
    const subcategories = await Promise.all([
      prisma.ticketCategory.create({
        data: {
          name: 'Hardware Issues',
          description: 'Physical hardware problems',
          color: 'orange',
          icon: 'cpu',
          parentId: categories[0].id,
          sortOrder: 1,
          customFields: {
            fields: [
              {
                id: 'hardware_type',
                label: 'Hardware Type',
                type: 'select',
                required: true,
                options: ['CPU', 'Memory', 'Storage', 'Network Card', 'Graphics Card', 'Motherboard']
              },
              {
                id: 'warranty_status',
                label: 'Warranty Status',
                type: 'select',
                required: false,
                options: ['Under Warranty', 'Out of Warranty', 'Unknown']
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.create({
        data: {
          name: 'Software Issues',
          description: 'Software and application problems',
          color: 'blue',
          icon: 'monitor',
          parentId: categories[0].id,
          sortOrder: 2,
          customFields: {
            fields: [
              {
                id: 'software_name',
                label: 'Software Name',
                type: 'text',
                required: true,
                placeholder: 'e.g., Microsoft Office, Adobe Photoshop'
              },
              {
                id: 'software_version',
                label: 'Software Version',
                type: 'text',
                required: false,
                placeholder: 'e.g., 2023, v1.2.3'
              }
            ]
          }
        }
      }),
      prisma.ticketCategory.create({
        data: {
          name: 'Network Issues',
          description: 'Connectivity and network problems',
          color: 'green',
          icon: 'wifi',
          parentId: categories[0].id,
          sortOrder: 3,
          customFields: {
            fields: [
              {
                id: 'connection_type',
                label: 'Connection Type',
                type: 'select',
                required: true,
                options: ['WiFi', 'Ethernet', 'Mobile Data', 'VPN']
              },
              {
                id: 'network_speed',
                label: 'Network Speed',
                type: 'select',
                required: false,
                options: ['Slow', 'Normal', 'Fast', 'Unknown']
              }
            ]
          }
        }
      })
    ]);

    console.log(`✅ Created ${categories.length} main categories and ${subcategories.length} subcategories`);

    // Create ticket priorities
    console.log('⚡ Creating ticket priorities...');
    const priorities = await Promise.all([
      prisma.ticketPriority.create({
        data: {
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
              },
              {
                condition: 'hours_since_created > 120',
                action: 'escalate_priority'
              }
            ]
          }
        }
      }),
      prisma.ticketPriority.create({
        data: {
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
              },
              {
                condition: 'hours_since_created > 48',
                action: 'notify_manager'
              }
            ]
          }
        }
      }),
      prisma.ticketPriority.create({
        data: {
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
      prisma.ticketPriority.create({
        data: {
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

    console.log(`✅ Created ${priorities.length} priority levels`);

    // Create ticket statuses
    console.log('📊 Creating ticket statuses...');
    const statuses = await Promise.all([
      prisma.ticketStatus.create({
        data: {
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
      prisma.ticketStatus.create({
        data: {
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
      prisma.ticketStatus.create({
        data: {
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
      prisma.ticketStatus.create({
        data: {
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
      prisma.ticketStatus.create({
        data: {
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
      prisma.ticketStatus.create({
        data: {
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
      prisma.ticketStatus.create({
        data: {
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

    console.log(`✅ Created ${statuses.length} status types`);

    // Create ticket templates
    console.log('📝 Creating ticket templates...');
    const templates = await Promise.all([
      prisma.ticketTemplate.create({
        data: {
          name: 'Hardware Issue Template',
          description: 'Template for hardware-related issues',
          categoryId: categories[0].id, // Technical Support
          title: 'Hardware Issue: [Device Type]',
          templateDescription: 'Please describe the hardware issue you are experiencing.',
          customFields: {
            device_type: 'Desktop',
            operating_system: 'Windows',
            error_frequency: 'First Time'
          }
        }
      }),
      prisma.ticketTemplate.create({
        data: {
          name: 'Billing Inquiry Template',
          description: 'Template for billing-related inquiries',
          categoryId: categories[1].id, // Billing
          title: 'Billing Inquiry',
          templateDescription: 'Please describe your billing question or issue.',
          customFields: {
            invoice_number: '',
            payment_method: 'Credit Card',
            amount: 0
          }
        }
      }),
      prisma.ticketTemplate.create({
        data: {
          name: 'Feature Request Template',
          description: 'Template for feature requests',
          categoryId: categories[2].id, // Feature Request
          title: 'Feature Request: [Feature Area]',
          templateDescription: 'Please describe the feature you would like to see implemented.',
          customFields: {
            feature_area: 'UI/UX',
            business_impact: 'Medium',
            user_story: 'As a user, I want...'
          }
        }
      }),
      prisma.ticketTemplate.create({
        data: {
          name: 'Bug Report Template',
          description: 'Template for bug reports',
          categoryId: categories[3].id, // Bug Report
          title: 'Bug Report: [Brief Description]',
          templateDescription: 'Please provide details about the bug you encountered.',
          customFields: {
            browser: 'Chrome',
            steps_to_reproduce: '1. Go to...\n2. Click on...\n3. See error...',
            expected_behavior: 'What should happen?',
            actual_behavior: 'What actually happens?'
          }
        }
      })
    ]);

    console.log(`✅ Created ${templates.length} ticket templates`);

    // Create workflows
    console.log('🔄 Creating automation workflows...');
    const workflows = await Promise.all([
      prisma.ticketWorkflow.create({
        data: {
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
      prisma.ticketWorkflow.create({
        data: {
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
      }),
      prisma.ticketWorkflow.create({
        data: {
          name: 'Critical Ticket Workflow',
          description: 'Special handling for critical priority tickets',
          priorityId: priorities[3].id, // Critical priority
          rules: {
            triggers: [
              {
                event: 'ticket_created',
                conditions: [
                  {
                    field: 'priority.level',
                    operator: 'equals',
                    value: 10
                  }
                ],
                actions: [
                  {
                    type: 'assign_to_agent',
                    value: 'admin'
                  },
                  {
                    type: 'notify_manager',
                    value: 'immediate'
                  },
                  {
                    type: 'set_status',
                    value: 'In Progress'
                  }
                ]
              }
            ]
          }
        }
      })
    ]);

    console.log(`✅ Created ${workflows.length} automation workflows`);

    // Create sample tickets
    console.log('🎫 Creating sample tickets...');
    const sampleTickets = await Promise.all([
      prisma.ticket.create({
        data: {
          title: 'Laptop won\'t boot after Windows update',
          description: 'My laptop was working fine yesterday, but after the Windows update last night, it won\'t boot. I see a blue screen with an error message.',
          categoryId: subcategories[0].id, // Hardware Issues
          priorityId: priorities[1].id, // Medium
          statusId: statuses[0].id, // Open
          submittedBy: users[4].id, // David Customer
          customFields: {
            device_type: 'Laptop',
            operating_system: 'Windows',
            error_frequency: 'First Time',
            hardware_type: 'CPU',
            warranty_status: 'Under Warranty'
          },
          slaResponseAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          slaResolveAt: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours from now
        }
      }),
      prisma.ticket.create({
        data: {
          title: 'Invoice #INV-2024-001 payment issue',
          description: 'I received invoice #INV-2024-001 but the payment was processed twice. I need a refund for the duplicate charge.',
          categoryId: categories[1].id, // Billing
          priorityId: priorities[2].id, // High
          statusId: statuses[1].id, // In Progress
          submittedBy: users[5].id, // Lisa User
          assignedTo: users[1].id, // Sarah Manager
          assignedAt: new Date(),
          customFields: {
            invoice_number: 'INV-2024-001',
            payment_method: 'Credit Card',
            amount: 299.99
          },
          slaResponseAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
          slaResolveAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      }),
      prisma.ticket.create({
        data: {
          title: 'Add dark mode to mobile app',
          description: 'The mobile app is missing a dark mode feature. This would be very helpful for users who prefer dark themes, especially for night usage.',
          categoryId: categories[2].id, // Feature Request
          priorityId: priorities[0].id, // Low
          statusId: statuses[0].id, // Open
          submittedBy: users[4].id, // David Customer
          customFields: {
            feature_area: 'Mobile App',
            business_impact: 'Medium',
            user_story: 'As a mobile app user, I want a dark mode option so that I can use the app comfortably in low-light conditions.'
          },
          slaResponseAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
          slaResolveAt: new Date(Date.now() + 168 * 60 * 60 * 1000) // 1 week from now
        }
      }),
      prisma.ticket.create({
        data: {
          title: 'Login button not working on Safari',
          description: 'The login button on the website doesn\'t work when using Safari browser. It works fine in Chrome and Firefox.',
          categoryId: categories[3].id, // Bug Report
          priorityId: priorities[1].id, // Medium
          statusId: statuses[2].id, // Pending
          submittedBy: users[5].id, // Lisa User
          assignedTo: users[3].id, // Emily Developer
          assignedAt: new Date(),
          customFields: {
            browser: 'Safari',
            steps_to_reproduce: '1. Go to the login page\n2. Enter valid credentials\n3. Click the login button\n4. Nothing happens',
            expected_behavior: 'User should be logged in and redirected to dashboard',
            actual_behavior: 'Login button does not respond to clicks'
          },
          slaResponseAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          slaResolveAt: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours from now
        }
      }),
      prisma.ticket.create({
        data: {
          title: 'Server down - critical production issue',
          description: 'Our main production server is down and customers cannot access the application. This is affecting all users.',
          categoryId: subcategories[0].id, // Hardware Issues
          priorityId: priorities[3].id, // Critical
          statusId: statuses[5].id, // Escalated
          submittedBy: users[0].id, // John Admin
          assignedTo: users[0].id, // John Admin
          assignedAt: new Date(),
          escalatedAt: new Date(),
          escalatedBy: users[1].id, // Sarah Manager
          customFields: {
            device_type: 'Server',
            operating_system: 'Linux',
            error_frequency: 'Constant',
            hardware_type: 'Motherboard',
            warranty_status: 'Under Warranty'
          },
          slaResponseAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          slaResolveAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours from now
        }
      })
    ]);

    console.log(`✅ Created ${sampleTickets.length} sample tickets`);

    // Create some comments for the tickets
    console.log('💬 Creating sample comments...');
    const comments = await Promise.all([
      prisma.comment.create({
        data: {
          ticketId: sampleTickets[0].id,
          authorId: users[2].id, // Mike Agent
          content: 'I\'ve received your ticket about the laptop boot issue. This is a common problem after Windows updates. Let me help you troubleshoot this.',
          isInternal: false
        }
      }),
      prisma.comment.create({
        data: {
          ticketId: sampleTickets[0].id,
          authorId: users[2].id, // Mike Agent
          content: 'Can you try booting into Safe Mode? Hold Shift while clicking Restart, then select Troubleshoot > Advanced Options > Startup Settings > Restart.',
          isInternal: false
        }
      }),
      prisma.comment.create({
        data: {
          ticketId: sampleTickets[1].id,
          authorId: users[1].id, // Sarah Manager
          content: 'I\'ve reviewed your billing issue and can confirm the duplicate charge. I\'ve initiated a refund that should appear in your account within 3-5 business days.',
          isInternal: false
        }
      }),
      prisma.comment.create({
        data: {
          ticketId: sampleTickets[3].id,
          authorId: users[3].id, // Emily Developer
          content: 'I\'ve reproduced the Safari login issue. It appears to be related to the event handler not being properly attached in Safari. I\'m working on a fix.',
          isInternal: false
        }
      }),
      prisma.comment.create({
        data: {
          ticketId: sampleTickets[4].id,
          authorId: users[0].id, // John Admin
          content: 'Server is back online. The issue was caused by a failed hardware component. I\'ve replaced the faulty part and the system is now stable.',
          isInternal: false
        }
      })
    ]);

    console.log(`✅ Created ${comments.length} sample comments`);

    // Create knowledge base articles
    console.log('📚 Creating knowledge base articles...');
    const knowledgeBase = await Promise.all([
      prisma.knowledgeBase.create({
        data: {
          title: 'How to Reset Your Password',
          content: 'If you\'ve forgotten your password, you can reset it by clicking the "Forgot Password" link on the login page. Enter your email address and follow the instructions in the email you receive.',
          category: 'Account Management',
          tags: ['password', 'login', 'security'],
          authorId: users[1].id, // Sarah Manager
          views: 156,
          helpful: 23
        }
      }),
      prisma.knowledgeBase.create({
        data: {
          title: 'Common Laptop Boot Issues',
          content: 'Laptop boot problems can be caused by various issues including corrupted system files, hardware failures, or software conflicts. Here are the most common solutions...',
          category: 'Technical Support',
          tags: ['laptop', 'boot', 'troubleshooting', 'hardware'],
          authorId: users[2].id, // Mike Agent
          views: 89,
          helpful: 15
        }
      }),
      prisma.knowledgeBase.create({
        data: {
          title: 'Understanding Your Invoice',
          content: 'Your monthly invoice includes all charges for the current billing period. You can view detailed breakdowns of each charge and download PDF copies of your invoices.',
          category: 'Billing',
          tags: ['invoice', 'billing', 'payment', 'account'],
          authorId: users[1].id, // Sarah Manager
          views: 234,
          helpful: 45
        }
      })
    ]);

    console.log(`✅ Created ${knowledgeBase.length} knowledge base articles`);

    console.log('🎉 Database reset and seed completed successfully.');
  } catch (error) {
    console.error('❌ Error during reset and seed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

resetAndSeed().catch((err) => {
  console.error('❌ Unhandled error in resetAndSeed:', err);
  process.exit(1);
});
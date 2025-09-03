# Enhanced Ticket System Setup Guide

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

**For Linux/Mac:**
```bash
cd backend
chmod +x setup-enhanced-system.sh
./setup-enhanced-system.sh
```

**For Windows:**
```cmd
cd backend
setup-enhanced-system.bat
```

### Option 2: Manual Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Reset database with enhanced schema
npx prisma db push --force-reset

# Seed with enhanced data
npm run db:reset
```

## 📊 What Gets Created

### 👥 Users (6 total)
- **Admin**: admin@tickethub.com / password123
- **Manager**: manager@tickethub.com / password123  
- **Agent**: agent@tickethub.com / password123
- **Developer**: developer@tickethub.com / password123
- **Customer**: customer@tickethub.com / password123
- **User**: user@tickethub.com / password123

### 📁 Categories (4 main + 3 subcategories)
- **Technical Support**
  - Hardware Issues
  - Software Issues  
  - Network Issues
- **Billing**
- **Feature Request**
- **Bug Report**

### ⚡ Priorities (4 levels)
- **Low** (Level 1): 72h response, 1 week resolution
- **Medium** (Level 3): 24h response, 3 days resolution
- **High** (Level 7): 8h response, 1 day resolution
- **Critical** (Level 10): 2h response, 8h resolution

### 📊 Statuses (7 types)
- Open, In Progress, Pending, Resolved, Closed, Escalated, Cancelled

### 📝 Templates (4 templates)
- Hardware Issue Template
- Billing Inquiry Template
- Feature Request Template
- Bug Report Template

### 🔄 Workflows (3 automation rules)
- Auto-Assignment Workflow
- Escalation Workflow
- Critical Ticket Workflow

### 🎫 Sample Data
- 5 sample tickets with realistic scenarios
- Comments and interactions
- Knowledge base articles

## 🎯 Key Features Implemented

### 1. **Hierarchical Categories**
- Parent-child category relationships
- Category-specific custom fields
- Auto-assignment rules per category

### 2. **Dynamic Custom Fields**
- Text, textarea, select, checkbox, date, number fields
- Field validation rules
- Required/optional field configuration

### 3. **Advanced SLA Management**
- Priority-based SLA times
- Escalation rules and triggers
- SLA breach notifications

### 4. **Status Workflow Management**
- Status transition rules
- Role-based permissions
- Complete audit trail

### 5. **Workflow Automation**
- Event-based triggers
- Conditional logic
- Automated actions

## 🛠️ Available Scripts

```bash
# Reset database and seed with enhanced data
npm run db:reset

# Seed only ticket system data (keeps existing users)
npm run db:seed-ticket-system

# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Start development server
npm run dev
```

## 🎫 Testing the System

### 1. **Login as Admin**
- Go to login page
- Use: admin@tickethub.com / password123
- Access admin interface at `/ticket-system-admin`

### 2. **Test Categories**
- Create new categories
- Add subcategories
- Configure custom fields
- Set up auto-assignment rules

### 3. **Test Priorities**
- Create custom priority levels
- Set SLA times
- Configure escalation rules

### 4. **Test Statuses**
- Create custom statuses
- Set transition rules
- Configure permissions

### 5. **Test Workflows**
- Create automation rules
- Set up triggers and conditions
- Test automated actions

## 🔧 Customization Examples

### Adding a New Category
```typescript
// In admin interface or via API
{
  name: "Security Issues",
  description: "Security-related problems and vulnerabilities",
  color: "red",
  icon: "shield",
  customFields: {
    fields: [
      {
        id: "severity",
        label: "Severity Level",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High", "Critical"]
      }
    ]
  }
}
```

### Creating Custom Priority
```typescript
{
  name: "Emergency",
  description: "System-wide emergencies requiring immediate attention",
  color: "red",
  level: 10,
  slaResponseHours: 1,
  slaResolveHours: 4,
  escalationRules: {
    rules: [
      {
        condition: "hours_since_created > 0.5",
        action: "notify_executive"
      }
    ]
  }
}
```

### Setting Up Workflow
```typescript
{
  name: "Security Issue Workflow",
  rules: {
    triggers: [
      {
        event: "ticket_created",
        conditions: [
          {
            field: "category.name",
            operator: "equals",
            value: "Security Issues"
          }
        ],
        actions: [
          {
            type: "assign_to_agent",
            value: "security_team"
          },
          {
            type: "set_priority",
            value: "high"
          }
        ]
      }
    ]
  }
}
```

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Check if database is running
npx prisma db push

# Reset database completely
npx prisma db push --force-reset
```

### Schema Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Check schema
npx prisma validate
```

### Seeding Issues
```bash
# Clear and reseed
npm run db:reset

# Check logs for errors
npm run db:reset 2>&1 | tee setup.log
```

## 📈 Next Steps

1. **Test the Admin Interface**
   - Navigate to `/ticket-system-admin`
   - Create and modify categories, priorities, statuses
   - Set up workflows and automation

2. **Create Sample Tickets**
   - Use different categories and priorities
   - Test custom fields
   - Verify SLA calculations

3. **Test Workflows**
   - Create tickets that trigger automation
   - Verify escalation rules
   - Check notification systems

4. **Customize for Your Needs**
   - Add your own categories
   - Configure SLA times
   - Set up custom workflows

## 🎉 Success!

Your enhanced ticket system is now ready with:
- ✅ Hierarchical categories with custom fields
- ✅ Advanced priority management with SLA tracking
- ✅ Comprehensive status workflows
- ✅ Workflow automation
- ✅ Complete admin interface
- ✅ Sample data for testing

Start the development server with `npm run dev` and begin exploring the enhanced features!

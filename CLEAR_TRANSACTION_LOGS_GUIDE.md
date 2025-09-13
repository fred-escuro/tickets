# Clear Transaction Logs Script Guide

This guide explains how to use the script to clear transaction logs from categories 1-4 of the ticketing system.

## What Gets Cleared

The script clears transaction logs from these categories:

### 1. Core Transaction Tables
- `tickets` - All ticket records
- `comments` - All ticket comments
- `attachments` - All file attachments

### 2. Email Transaction Tables
- `email_logs` - All email tracking records
- `auto_responses` - All automated email responses
- `email_followups` - All email follow-up records

### 3. Task Management Transaction Tables
- `ticket_tasks` - All ticket subtasks
- `task_comments` - All task comments

### 4. History & Audit Transaction Tables
- `ticket_status_history` - All ticket status change history
- `ticket_assignment_history` - All ticket assignment history
- `task_status_history` - All task status change history
- `task_assignment_history` - All task assignment history
- `ticket_events` - All ticket events

## ⚠️ Important Notes

- **This action is IRREVERSIBLE** - All transaction data will be permanently deleted
- **Reference data is preserved** - Users, departments, roles, categories, priorities, statuses, etc. remain intact
- **Run during maintenance windows** - This should be done when the system is not actively used
- **Backup recommended** - Consider creating a database backup before running this script

## How to Run the Script

### Prerequisites
- Node.js and npm installed
- Database connection configured
- Access to the backend directory

### Steps

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Run the script using ts-node:**
   ```bash
   npx ts-node src/scripts/clearTransactionLogs.ts
   ```

3. **Alternative: Compile and run:**
   ```bash
   # Compile TypeScript
   npm run build
   
   # Run the compiled script
   node dist/scripts/clearTransactionLogs.js
   ```

### Expected Output

The script will show progress and summary:
```
🧹 Starting transaction logs cleanup...

📋 Clearing Core Transaction Tables...
   ✅ Deleted 150 tickets
   ✅ Deleted 450 comments
   ✅ Deleted 75 attachments

📧 Clearing Email Transaction Tables...
   ✅ Deleted 200 email logs
   ✅ Deleted 25 auto responses
   ✅ Deleted 10 email followups

📝 Clearing Task Management Transaction Tables...
   ✅ Deleted 30 ticket tasks
   ✅ Deleted 60 task comments

📊 Clearing History & Audit Transaction Tables...
   ✅ Deleted 200 ticket status history records
   ✅ Deleted 50 ticket assignment history records
   ✅ Deleted 15 task status history records
   ✅ Deleted 8 task assignment history records
   ✅ Deleted 25 ticket events

🎉 Transaction logs cleanup completed successfully!

📊 Summary:
   • Core Tables: 150 tickets, 450 comments, 75 attachments
   • Email Tables: 200 email logs, 25 auto responses, 10 followups
   • Task Tables: 30 tasks, 60 task comments
   • History Tables: 298 history records
```

## What Remains Intact

The following data is **NOT** cleared and remains in the system:

### Reference Data (Categories 5-6)
- **User & Organization Tables:** `user_departments`, `user_roles`, `role_permissions`, `menu_item_permissions`
- **System Configuration Tables:** `app_settings`, `setting_history`

### Master Data Tables
- Users, departments, roles, permissions
- Ticket categories, priorities, statuses
- Task statuses, priorities
- Menu items, access policies
- Knowledge base articles
- Auto-response templates
- Ticket templates and workflows

## Use Cases

This script is useful for:
- **System maintenance** - Clearing old transaction data
- **Testing environments** - Resetting transaction data while keeping configuration
- **Data archiving** - Before moving old data to archive storage
- **Performance optimization** - Reducing database size for better performance

## Safety Recommendations

1. **Create a backup** before running the script
2. **Test in a development environment** first
3. **Schedule during maintenance windows**
4. **Monitor system performance** after cleanup
5. **Verify application functionality** after cleanup

## Troubleshooting

If you encounter errors:
- Check database connection
- Verify Prisma client is properly configured
- Ensure you have sufficient database permissions
- Check for any active database connections that might lock tables

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to clear transaction logs from categories 1-4:
 * 1. Core Transaction Tables
 * 2. Email Transaction Tables  
 * 3. Task Management Transaction Tables
 * 4. History & Audit Transaction Tables
 */
async function clearTransactionLogs() {
  console.log('🧹 Starting transaction logs cleanup...\n');

  try {
    // 1. Core Transaction Tables
    console.log('📋 Clearing Core Transaction Tables...');
    
    // Clear attachments first (has foreign keys to tickets and comments)
    const deletedAttachments = await prisma.attachment.deleteMany();
    console.log(`   ✅ Deleted ${deletedAttachments.count} attachments`);
    
    // Clear comments (has foreign keys to tickets)
    const deletedComments = await prisma.comment.deleteMany();
    console.log(`   ✅ Deleted ${deletedComments.count} comments`);
    
    // Clear tickets (main table)
    const deletedTickets = await prisma.ticket.deleteMany();
    console.log(`   ✅ Deleted ${deletedTickets.count} tickets`);

    // 2. Email Transaction Tables
    console.log('\n📧 Clearing Email Transaction Tables...');
    
    // Clear email followups first (has foreign keys to auto_responses)
    const deletedFollowups = await prisma.emailFollowup.deleteMany();
    console.log(`   ✅ Deleted ${deletedFollowups.count} email followups`);
    
    // Clear auto responses (has foreign keys to tickets)
    const deletedAutoResponses = await prisma.autoResponse.deleteMany();
    console.log(`   ✅ Deleted ${deletedAutoResponses.count} auto responses`);
    
    // Clear email logs
    const deletedEmailLogs = await prisma.emailLog.deleteMany();
    console.log(`   ✅ Deleted ${deletedEmailLogs.count} email logs`);

    // 3. Task Management Transaction Tables
    console.log('\n📝 Clearing Task Management Transaction Tables...');
    
    // Clear task comments first (has foreign keys to tasks)
    const deletedTaskComments = await prisma.taskComment.deleteMany();
    console.log(`   ✅ Deleted ${deletedTaskComments.count} task comments`);
    
    // Clear ticket tasks
    const deletedTasks = await prisma.ticketTask.deleteMany();
    console.log(`   ✅ Deleted ${deletedTasks.count} ticket tasks`);

    // 4. History & Audit Transaction Tables
    console.log('\n📊 Clearing History & Audit Transaction Tables...');
    
    // Clear task assignment history (has foreign keys to tasks)
    const deletedTaskAssignmentHistory = await prisma.taskAssignmentHistory.deleteMany();
    console.log(`   ✅ Deleted ${deletedTaskAssignmentHistory.count} task assignment history records`);
    
    // Clear task status history (has foreign keys to tasks)
    const deletedTaskStatusHistory = await prisma.taskStatusHistory.deleteMany();
    console.log(`   ✅ Deleted ${deletedTaskStatusHistory.count} task status history records`);
    
    // Clear ticket assignment history (has foreign keys to tickets)
    const deletedTicketAssignmentHistory = await prisma.ticketAssignmentHistory.deleteMany();
    console.log(`   ✅ Deleted ${deletedTicketAssignmentHistory.count} ticket assignment history records`);
    
    // Clear ticket status history (has foreign keys to tickets)
    const deletedTicketStatusHistory = await prisma.ticketStatusHistory.deleteMany();
    console.log(`   ✅ Deleted ${deletedTicketStatusHistory.count} ticket status history records`);
    
    // Clear ticket events (has foreign keys to tickets)
    const deletedTicketEvents = await prisma.ticketEvent.deleteMany();
    console.log(`   ✅ Deleted ${deletedTicketEvents.count} ticket events`);

    console.log('\n🎉 Transaction logs cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Core Tables: ${deletedTickets.count} tickets, ${deletedComments.count} comments, ${deletedAttachments.count} attachments`);
    console.log(`   • Email Tables: ${deletedEmailLogs.count} email logs, ${deletedAutoResponses.count} auto responses, ${deletedFollowups.count} followups`);
    console.log(`   • Task Tables: ${deletedTasks.count} tasks, ${deletedTaskComments.count} task comments`);
    console.log(`   • History Tables: ${deletedTicketStatusHistory.count + deletedTicketAssignmentHistory.count + deletedTaskStatusHistory.count + deletedTaskAssignmentHistory.count + deletedTicketEvents.count} history records`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearTransactionLogs().catch(console.error);

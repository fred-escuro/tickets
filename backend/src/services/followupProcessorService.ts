import { prisma } from '../index';
import { Comment, Ticket, User, FollowupStatus } from '@prisma/client';
import { followupDetectionService, InboundEmail } from './followupDetectionService';
import { emailNotificationService } from './emailNotificationService';

export interface FollowupProcessingResult {
  success: boolean;
  ticketId?: string;
  commentId?: string;
  followupId?: string;
  error?: string;
}

export interface ProcessedFollowup {
  id: string;
  ticketId: string;
  content: string;
  authorEmail: string;
  processedAt: Date;
  status: FollowupStatus;
}

export class FollowupProcessorService {
  /**
   * Processes a follow-up email and adds it as a ticket comment
   */
  async processFollowup(email: InboundEmail): Promise<FollowupProcessingResult> {
    try {
      // Detect if this is a follow-up to an auto-response
      const detection = await followupDetectionService.detectAutoResponseReply(email);
      
      if (!detection.isFollowup || !detection.ticketId || !detection.autoResponseId) {
        return {
          success: false,
          error: 'Not a valid follow-up to an auto-response'
        };
      }

      // Get the ticket details
      const ticket = await prisma.ticket.findUnique({
        where: { id: detection.ticketId },
        include: {
          submitter: true
        }
      });

      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // Parse and clean the follow-up content
      const cleanedContent = this.parseFollowupContent(email);
      
      // Log the cleaning process for debugging
      console.log('Original follow-up content:', email.body.substring(0, 200) + '...');
      console.log('Cleaned follow-up content:', cleanedContent);

      // Add comment to ticket
      const comment = await this.addCommentToTicket(
        detection.ticketId,
        cleanedContent,
        email.from,
        false // Not internal
      );

      // Record the follow-up
      const followup = await followupDetectionService.recordFollowup(
        detection.autoResponseId,
        detection.ticketId,
        email,
        FollowupStatus.PROCESSED
      );

      // Update ticket status if needed
      await this.updateTicketStatus(ticket, email);

      // Notify assigned agent
      if (ticket.assignedTo) {
        await this.notifyAgent(ticket, comment, email);
      }

      return {
        success: true,
        ticketId: detection.ticketId,
        commentId: comment.id,
        followupId: followup.id
      };
    } catch (error) {
      console.error('Error processing follow-up:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parses and cleans follow-up email content
   */
  private parseFollowupContent(email: InboundEmail): string {
    let content = email.body;

    // Remove common email signatures and footers
    const signaturePatterns = [
      /--\s*$/m,
      /Best regards,?$/m,
      /Sincerely,?$/m,
      /Thanks,?$/m,
      /Regards,?$/m,
      /Sent from my .+$/m,
      /Get Outlook for .+$/m,
      /This email was sent from .+$/m,
      /TicketHub Support Team.*$/s,
      /Our support team will review.*$/s
    ];

    for (const pattern of signaturePatterns) {
      content = content.split(pattern)[0];
    }

    // First, try to remove auto-response content specifically
    content = this.removeAutoResponseContent(content);

    // Remove quoted content and original messages
    const quotedPatterns = [
      // Common email reply patterns
      /On .+ wrote:.*$/s,
      /From: .+ Sent: .+ To: .+ Subject: .+$/s,
      /-----Original Message-----.*$/s,
      /Begin forwarded message:.*$/s,
      /From: .+ Date: .+ Subject: .+$/s,
      /Sent: .+ To: .+ Subject: .+$/s,
      
      // Generic quoted content patterns
      /^>.*$/gm,
      /^On .+ at .+ wrote:$/m,
      /^From: .+$/m,
      /^To: .+$/m,
      /^Subject: .+$/m,
      /^Date: .+$/m,
      /^Sent: .+$/m,
      
      // Outlook/Gmail specific patterns
      /^From: .+ Sent: .+ To: .+ Subject: .+$/m,
      /^On .+ wrote:$/m,
      /^On .+ at .+ wrote:$/m,
      
      // Generic email thread patterns
      /^On .+ wrote:.*$/s,
      /^-----Original Message-----.*$/s,
      /^Begin forwarded message:.*$/s
    ];

    for (const pattern of quotedPatterns) {
      content = content.split(pattern)[0];
    }

    // Remove multiple consecutive empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove leading/trailing whitespace
    content = content.trim();

    // If content is too short after cleaning, try to extract meaningful content
    if (content.length < 10) {
      content = this.extractUserMessage(email.body);
    }

    return content;
  }

  /**
   * Removes auto-response content from follow-up emails
   */
  private removeAutoResponseContent(content: string): string {
    // Auto-response specific patterns to remove
    const autoResponsePatterns = [
      // Ticket acknowledgment patterns
      /Thank you for contacting.*?Support Team.*$/s,
      /We have received your request.*?Support Team.*$/s,
      /Your ticket has been created.*?Support Team.*$/s,
      /Ticket #\d+ has been created.*?Support Team.*$/s,
      
      // Auto-response headers
      /RE: .+ - Ticket #\d+.*$/s,
      /Ticket number: .+$/m,
      /Subject: .+$/m,
      /Priority: .+$/m,
      /Category: .+$/m,
      /Status: .+$/m,
      
      // Auto-response body content
      /Our support team will review your request.*$/s,
      /You can track the progress of your ticket.*$/s,
      /If you have any additional information.*$/s,
      /Please do not reply to this email.*$/s,
      /This email was sent automatically.*$/s,
      /This is an automated response.*$/s,
      
      // Common auto-response phrases
      /Thank you for contacting .+ support.*$/s,
      /We have received your request and created ticket.*$/s,
      /Your request has been logged as ticket.*$/s,
      /We will respond within \d+ hours.*$/s,
      /Our team will review and respond.*$/s,
      
      // TicketHub specific patterns
      /TicketHub.*$/s,
      /Support Team.*$/s,
      /Best regards,.*$/s
    ];

    let cleanedContent = content;
    
    for (const pattern of autoResponsePatterns) {
      cleanedContent = cleanedContent.split(pattern)[0];
    }

    // Also remove content that looks like it's from an auto-response
    // by checking for common auto-response structure
    const lines = cleanedContent.split('\n');
    const filteredLines = [];
    let inAutoResponse = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line starts an auto-response
      if (line.match(/^(Thank you for contacting|We have received|Your ticket|Ticket #|RE: .+ - Ticket #)/)) {
        inAutoResponse = true;
        continue;
      }
      
      // Check if this line ends the auto-response
      if (inAutoResponse && (line.match(/^(Best regards|Support Team|Thank you)/) || line === '')) {
        inAutoResponse = false;
        continue;
      }
      
      // If we're not in an auto-response, keep the line
      if (!inAutoResponse) {
        filteredLines.push(lines[i]);
      }
    }
    
    return filteredLines.join('\n').trim();
  }

  /**
   * Extracts the actual user message from email content
   */
  private extractUserMessage(emailBody: string): string {
    // Try to find the actual user message by looking for common patterns
    const userMessagePatterns = [
      /^(Thank you!?.*)$/m,
      /^(Please.*)$/m,
      /^(I need.*)$/m,
      /^(Can you.*)$/m,
      /^(When will.*)$/m,
      /^(Followup please.*)$/m,
      /^(Update.*)$/m,
      /^(Status.*)$/m,
      /^(Hi.*)$/m,
      /^(Hello.*)$/m,
      /^(I would like.*)$/m,
      /^(Could you.*)$/m,
      /^(Is there.*)$/m,
      /^(What is.*)$/m,
      /^(How long.*)$/m,
      /^(When can.*)$/m
    ];
    
    for (const pattern of userMessagePatterns) {
      const match = emailBody.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Try to find the first meaningful line that's not part of an auto-response
    const lines = emailBody.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 5 && 
          !trimmedLine.match(/^(From:|To:|Subject:|Date:|Sent:|Ticket|Priority|Category|Status|Thank you for contacting|We have received|Your ticket|RE:)/) &&
          !trimmedLine.match(/^(Best regards|Support Team|TicketHub)/)) {
        return trimmedLine;
      }
    }
    
    // If still no meaningful content, include the original with a note
    return `Follow-up from user:\n\n${emailBody}`;
  }

  /**
   * Adds a comment to a ticket
   */
  private async addCommentToTicket(
    ticketId: string,
    content: string,
    authorEmail: string,
    isInternal: boolean = false
  ): Promise<Comment> {
    try {
      // Find or create a user for the email address
      let author = await prisma.user.findUnique({
        where: { email: authorEmail }
      });

      if (!author) {
        // Create a temporary user for external email senders
        author = await prisma.user.create({
          data: {
            email: authorEmail,
            firstName: authorEmail.split('@')[0],
            lastName: 'User',
            password: 'external-user', // Will be updated if they register
            isAgent: false
          }
        });
      }

      return await prisma.comment.create({
        data: {
          ticketId,
          authorId: author.id,
          content,
          isInternal
        }
      });
    } catch (error) {
      console.error('Error adding comment to ticket:', error);
      throw error;
    }
  }

  /**
   * Updates ticket status based on follow-up content
   */
  private async updateTicketStatus(ticket: Ticket, email: InboundEmail): Promise<void> {
    try {
      const content = email.body.toLowerCase();
      
      // Check for status-changing keywords
      const statusKeywords = {
        resolved: ['resolved', 'fixed', 'working', 'solved', 'completed', 'done'],
        closed: ['closed', 'finished', 'end', 'stop'],
        reopened: ['reopen', 'still broken', 'not working', 'issue persists', 'problem continues']
      };

      let newStatus = null;

      // Check for resolved keywords
      if (statusKeywords.resolved.some(keyword => content.includes(keyword))) {
        newStatus = 'RESOLVED';
      }
      // Check for closed keywords
      else if (statusKeywords.closed.some(keyword => content.includes(keyword))) {
        newStatus = 'CLOSED';
      }
      // Check for reopened keywords
      else if (statusKeywords.reopened.some(keyword => content.includes(keyword))) {
        newStatus = 'OPEN';
      }

      if (newStatus) {
        // Find the status ID by name
        const status = await prisma.ticketStatus.findFirst({
          where: { name: newStatus }
        });

        if (status && status.id !== ticket.statusId) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { 
              statusId: status.id,
              updatedAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  }

  /**
   * Notifies the assigned agent about the follow-up
   */
  private async notifyAgent(ticket: Ticket, comment: Comment, email: InboundEmail): Promise<void> {
    try {
      if (!ticket.assignedTo) return;

      const agent = await prisma.user.findUnique({
        where: { id: ticket.assignedTo }
      });

      if (!agent) return;

      // Send email notification
      await emailNotificationService.sendFollowupNotification({
        agentEmail: agent.email,
        agentName: `${agent.firstName} ${agent.lastName}`,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        customerEmail: email.from,
        followupContent: comment.content,
        ticketUrl: `${process.env.FRONTEND_URL}/tickets/${ticket.id}`
      });

      // TODO: Add real-time notification here
      console.log(`Notified agent ${agent.email} about follow-up on ticket ${ticket.id}`);
    } catch (error) {
      console.error('Error notifying agent:', error);
    }
  }

  /**
   * Gets all follow-ups for a ticket
   */
  async getTicketFollowups(ticketId: string): Promise<ProcessedFollowup[]> {
    try {
      const followups = await prisma.emailFollowup.findMany({
        where: { ticketId },
        orderBy: { processedAt: 'desc' },
        include: {
          autoResponse: {
            include: {
              template: true
            }
          }
        }
      });

      return followups.map(followup => ({
        id: followup.id,
        ticketId: followup.ticketId,
        content: followup.content,
        authorEmail: followup.autoResponse.toEmail,
        processedAt: followup.processedAt,
        status: followup.status
      }));
    } catch (error) {
      console.error('Error fetching ticket follow-ups:', error);
      return [];
    }
  }

  /**
   * Processes multiple follow-ups in batch
   */
  async processBatchFollowups(emails: InboundEmail[]): Promise<FollowupProcessingResult[]> {
    const results: FollowupProcessingResult[] = [];

    for (const email of emails) {
      try {
        const result = await this.processFollowup(email);
        results.push(result);
      } catch (error) {
        console.error(`Error processing follow-up for email ${email.id}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Gets follow-up statistics
   */
  async getFollowupStats(ticketId?: string): Promise<{
    totalFollowups: number;
    processedFollowups: number;
    failedFollowups: number;
    recentFollowups: number;
  }> {
    try {
      const whereClause = ticketId ? { ticketId } : {};

      const [total, processed, failed, recent] = await Promise.all([
        prisma.emailFollowup.count({ where: whereClause }),
        prisma.emailFollowup.count({ 
          where: { ...whereClause, status: FollowupStatus.PROCESSED } 
        }),
        prisma.emailFollowup.count({ 
          where: { ...whereClause, status: FollowupStatus.FAILED } 
        }),
        prisma.emailFollowup.count({
          where: {
            ...whereClause,
            processedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      return {
        totalFollowups: total,
        processedFollowups: processed,
        failedFollowups: failed,
        recentFollowups: recent
      };
    } catch (error) {
      console.error('Error fetching follow-up stats:', error);
      return {
        totalFollowups: 0,
        processedFollowups: 0,
        failedFollowups: 0,
        recentFollowups: 0
      };
    }
  }
}

export const followupProcessorService = new FollowupProcessorService();

import { prisma } from '../index';
import { EmailMessageType } from '@prisma/client';

export interface EmailInteractionData {
  messageId: string;
  imapUid: number;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
  attachments?: any[];
  headers: any;
}

export class ComprehensiveReplyLoggingService {
  /**
   * Log all email interactions - replies, followups, and conversations
   */
  async logEmailInteraction(emailData: EmailInteractionData): Promise<string> {
    try {
      // 1. Always log the email to EmailLog table
      const emailLog = await prisma.emailLog.create({
        data: {
          messageId: emailData.messageId,
          imapUid: emailData.imapUid,
          direction: 'INBOUND',
          type: this.determineEmailType(emailData),
          from: emailData.from,
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          body: emailData.body,
          htmlBody: emailData.htmlBody,
          receivedAt: emailData.receivedAt,
          inReplyTo: emailData.inReplyTo,
          references: emailData.references,
          status: 'PROCESSING',
          rawMeta: { 
            headers: emailData.headers,
            threadId: emailData.threadId,
            attachments: emailData.attachments?.length || 0
          }
        }
      });

      // 2. Detect and log reply relationships
      await this.logReplyRelationships(emailLog, emailData);

      // 3. Detect and log followup relationships
      await this.logFollowupRelationships(emailLog, emailData);

      // 4. Log conversation threading
      await this.logConversationThread(emailLog, emailData);

      console.log(`✅ Logged email interaction: ${emailData.subject} (${emailLog.id})`);

      return emailLog.id;

    } catch (error) {
      console.error('Error logging email interaction:', error);
      throw error;
    }
  }

  /**
   * Determine email type based on content and headers
   */
  private determineEmailType(emailData: EmailInteractionData): EmailMessageType {
    // Check for auto-response reply indicators
    if (emailData.subject?.includes('[Response-ID:') || 
        emailData.body?.includes('[Response-ID:') ||
        emailData.htmlBody?.includes('[Response-ID:')) {
      return 'REPLY';
    }

    // Check for reply indicators in subject
    if (emailData.subject?.toLowerCase().startsWith('re:') ||
        emailData.subject?.toLowerCase().startsWith('re -') ||
        emailData.subject?.toLowerCase().includes('re:')) {
      return 'REPLY';
    }

    // Check for forward indicators (treat as reply since FORWARD is not in enum)
    if (emailData.subject?.toLowerCase().startsWith('fw:') ||
        emailData.subject?.toLowerCase().startsWith('fwd:') ||
        emailData.subject?.toLowerCase().includes('forward:')) {
      return 'REPLY';
    }

    // Check for in-reply-to header
    if (emailData.inReplyTo) {
      return 'REPLY';
    }

    // Default to NEW
    return 'NEW';
  }

  /**
   * Log reply relationships between emails
   */
  private async logReplyRelationships(emailLog: any, emailData: EmailInteractionData): Promise<void> {
    try {
      // Find the email this is replying to
      if (emailData.inReplyTo) {
        const parentEmail = await prisma.emailLog.findFirst({
          where: { messageId: emailData.inReplyTo }
        });

        if (parentEmail) {
          // Log the reply relationship in rawMeta for now (we'll create a proper table later)
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              rawMeta: {
                ...emailLog.rawMeta,
                replyTo: {
                  parentEmailId: parentEmail.id,
                  parentSubject: parentEmail.subject,
                  relationshipType: 'DIRECT_REPLY',
                  confidence: 0.9
                }
              }
            }
          });

          console.log(`📧 Logged reply relationship: ${parentEmail.subject} -> ${emailLog.subject}`);
        }
      }

      // Check for ticket number in subject for ticket replies
      const ticketNumber = this.extractTicketNumber(emailData.subject);
      if (ticketNumber) {
        const ticket = await prisma.ticket.findFirst({
          where: { ticketNumber: ticketNumber }
        });

        if (ticket) {
          // Update email log with ticket association
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { ticketId: ticket.id }
          });

          console.log(`🎫 Associated email with ticket #${ticketNumber}`);
        }
      }

    } catch (error) {
      console.error('Error logging reply relationships:', error);
    }
  }

  /**
   * Log followup relationships (replies to auto-responses)
   */
  private async logFollowupRelationships(emailLog: any, emailData: EmailInteractionData): Promise<void> {
    try {
      // Extract response ID if present
      const responseId = this.extractResponseId(emailData);
      if (responseId) {
        const autoResponse = await prisma.autoResponse.findFirst({
          where: { responseId: responseId }
        });

        if (autoResponse) {
          // Create followup record
          await prisma.emailFollowup.create({
            data: {
              autoResponseId: autoResponse.id,
              ticketId: autoResponse.ticketId,
              originalEmailId: emailLog.id,
              content: emailData.body,
              processedAt: new Date(),
              status: 'PROCESSED'
            }
          });

          // Update email log
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { 
              ticketId: autoResponse.ticketId,
              type: 'REPLY'
            }
          });

          console.log(`🔄 Logged followup: ${emailData.subject} -> Auto-response ${responseId}`);
        }
      }

    } catch (error) {
      console.error('Error logging followup relationships:', error);
    }
  }

  /**
   * Log conversation threading
   */
  private async logConversationThread(emailLog: any, emailData: EmailInteractionData): Promise<void> {
    try {
      // Extract thread ID or create one
      let threadId = emailData.threadId;
      
      if (!threadId && emailData.inReplyTo) {
        // Try to find thread from parent email
        const parentEmail = await prisma.emailLog.findFirst({
          where: { messageId: emailData.inReplyTo }
        });
        
        if (parentEmail) {
          threadId = parentEmail.threadId || parentEmail.messageId || undefined;
        }
      }

      if (!threadId) {
        threadId = emailData.messageId; // Use message ID as thread ID for new conversations
      }

      // Update email log with thread ID
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { threadId: threadId }
      });

      console.log(`🧵 Logged conversation thread: ${threadId}`);

    } catch (error) {
      console.error('Error logging conversation thread:', error);
    }
  }

  /**
   * Extract ticket number from subject
   */
  private extractTicketNumber(subject: string): number | null {
    const match = subject.match(/#(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract response ID from email content
   */
  private extractResponseId(emailData: EmailInteractionData): string | null {
    const responseIdPattern = /\[Response-ID:\s*([^\]]+)\]/i;
    
    // Check subject
    let match = emailData.subject?.match(responseIdPattern) || null;
    if (match) return match[1];
    
    // Check body
    match = emailData.body?.match(responseIdPattern) || null;
    if (match) return match[1];
    
    // Check HTML body
    match = emailData.htmlBody?.match(responseIdPattern) || null;
    if (match) return match[1];
    
    return null;
  }

  /**
   * Get conversation thread for an email
   */
  async getConversationThread(emailLogId: string): Promise<any[]> {
    try {
      const emailLog = await prisma.emailLog.findUnique({
        where: { id: emailLogId }
      });

      if (!emailLog || !emailLog.threadId) {
        return [emailLog];
      }

      // Get all emails in the same thread
      const threadEmails = await prisma.emailLog.findMany({
        where: { threadId: emailLog.threadId },
        orderBy: { receivedAt: 'asc' }
      });

      return threadEmails;

    } catch (error) {
      console.error('Error getting conversation thread:', error);
      return [];
    }
  }

  /**
   * Get reply chain for an email
   */
  async getReplyChain(emailLogId: string): Promise<any[]> {
    try {
      const emailLog = await prisma.emailLog.findUnique({
        where: { id: emailLogId }
      });

      if (!emailLog) {
        return [];
      }

      const replyChain = [emailLog];
      
      // Find replies to this email
      const replies = await prisma.emailLog.findMany({
        where: { inReplyTo: emailLog.messageId },
        orderBy: { receivedAt: 'asc' }
      });

      // Recursively get replies to replies
      for (const reply of replies) {
        const subReplies = await this.getReplyChain(reply.id);
        replyChain.push(...subReplies);
      }

      return replyChain;

    } catch (error) {
      console.error('Error getting reply chain:', error);
      return [];
    }
  }
}

export const comprehensiveReplyLoggingService = new ComprehensiveReplyLoggingService();

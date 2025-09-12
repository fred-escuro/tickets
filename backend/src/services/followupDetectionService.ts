import { prisma } from '../index';
import { AutoResponse, EmailFollowup, FollowupStatus } from '@prisma/client';

export interface InboundEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  messageId?: string;
  receivedAt: Date;
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
  }>;
}

export interface FollowupDetectionResult {
  isFollowup: boolean;
  autoResponseId?: string;
  ticketId?: string;
  confidence: number;
  reason?: string;
}

export class FollowupDetectionService {
  /**
   * Detects if an incoming email is a follow-up to an auto-response
   */
  async detectAutoResponseReply(email: InboundEmail): Promise<FollowupDetectionResult> {
    try {
      // Method 1: Check for response ID in subject or body
      const responseIdMatch = this.extractResponseId(email);
      if (responseIdMatch) {
        const autoResponse = await this.getAutoResponseByResponseId(responseIdMatch);
        if (autoResponse) {
          return {
            isFollowup: true,
            autoResponseId: autoResponse.id,
            ticketId: autoResponse.ticketId,
            confidence: 0.9,
            reason: 'Response ID found in email content'
          };
        }
      }

      // Method 2: Check email thread headers
      const threadMatch = await this.detectByThreadHeaders(email);
      if (threadMatch.isFollowup) {
        return threadMatch;
      }

      // Method 3: Check for auto-response patterns in subject
      const subjectMatch = await this.detectBySubjectPattern(email);
      if (subjectMatch.isFollowup) {
        return subjectMatch;
      }

      // Method 4: Check for reply patterns
      const replyMatch = await this.detectByReplyPattern(email);
      if (replyMatch.isFollowup) {
        return replyMatch;
      }

      return {
        isFollowup: false,
        confidence: 0,
        reason: 'No follow-up patterns detected'
      };
    } catch (error) {
      console.error('Error detecting follow-up:', error);
      return {
        isFollowup: false,
        confidence: 0,
        reason: 'Error during detection'
      };
    }
  }

  /**
   * Extracts response ID from email content
   */
  private extractResponseId(email: InboundEmail): string | null {
    // Look for response ID patterns in subject and body
    const responseIdPatterns = [
      /\[Response-ID:\s*([a-zA-Z0-9-]+)\]/i,
      /\[Ticket:\s*([a-zA-Z0-9-]+)\]/i,
      /Response-ID:\s*([a-zA-Z0-9-]+)/i,
      /Ticket-ID:\s*([a-zA-Z0-9-]+)/i
    ];

    const searchText = `${email.subject} ${email.body}`.toLowerCase();

    for (const pattern of responseIdPatterns) {
      const match = searchText.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Gets auto-response by response ID
   */
  private async getAutoResponseByResponseId(responseId: string): Promise<AutoResponse | null> {
    try {
      return await prisma.autoResponse.findUnique({
        where: { responseId },
        include: {
          ticket: true,
          template: true
        }
      });
    } catch (error) {
      console.error('Error fetching auto-response by response ID:', error);
      return null;
    }
  }

  /**
   * Detects follow-up using email thread headers
   */
  private async detectByThreadHeaders(email: InboundEmail): Promise<FollowupDetectionResult> {
    if (!email.threadId && !email.inReplyTo && !email.references) {
      return { isFollowup: false, confidence: 0 };
    }

    try {
      // Check if threadId matches any auto-response thread
      if (email.threadId) {
        const autoResponse = await prisma.autoResponse.findFirst({
          where: { threadId: email.threadId },
          orderBy: { sentAt: 'desc' }
        });

        if (autoResponse) {
          return {
            isFollowup: true,
            autoResponseId: autoResponse.id,
            ticketId: autoResponse.ticketId,
            confidence: 0.8,
            reason: 'Thread ID matches auto-response'
          };
        }
      }

      // Check inReplyTo header
      if (email.inReplyTo && typeof email.inReplyTo === 'string') {
        const autoResponse = await prisma.autoResponse.findFirst({
          where: {
            OR: [
              { responseId: email.inReplyTo },
              { threadId: email.inReplyTo }
            ]
          },
          orderBy: { sentAt: 'desc' }
        });

        if (autoResponse) {
          return {
            isFollowup: true,
            autoResponseId: autoResponse.id,
            ticketId: autoResponse.ticketId,
            confidence: 0.7,
            reason: 'In-Reply-To header matches auto-response'
          };
        }
      }

      // Check references header
      if (email.references && typeof email.references === 'string') {
        const references = email.references.split(/\s+/);
        for (const ref of references) {
          const autoResponse = await prisma.autoResponse.findFirst({
            where: {
              OR: [
                { responseId: ref },
                { threadId: ref }
              ]
            },
            orderBy: { sentAt: 'desc' }
          });

          if (autoResponse) {
            return {
              isFollowup: true,
              autoResponseId: autoResponse.id,
              ticketId: autoResponse.ticketId,
              confidence: 0.6,
              reason: 'References header matches auto-response'
            };
          }
        }
      }

      return { isFollowup: false, confidence: 0 };
    } catch (error) {
      console.error('Error detecting by thread headers:', error);
      return { isFollowup: false, confidence: 0 };
    }
  }

  /**
   * Detects follow-up using subject patterns
   */
  private async detectBySubjectPattern(email: InboundEmail): Promise<FollowupDetectionResult> {
    const subject = email.subject.toLowerCase();
    
    // Common auto-response subject patterns
    const patterns = [
      /re:\s*.*support.*ticket/i,
      /re:\s*.*technical.*support/i,
      /re:\s*.*account.*support/i,
      /re:\s*.*ticket.*#[0-9]+/i,
      /re:\s*.*auto.*response/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(subject)) {
        // Try to find recent auto-responses to the same email address
        const recentResponses = await prisma.autoResponse.findMany({
          where: {
            toEmail: email.from,
            sentAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          orderBy: { sentAt: 'desc' },
          take: 5
        });

        if (recentResponses.length > 0) {
          return {
            isFollowup: true,
            autoResponseId: recentResponses[0].id,
            ticketId: recentResponses[0].ticketId,
            confidence: 0.5,
            reason: 'Subject pattern matches and recent auto-response found'
          };
        }
      }
    }

    return { isFollowup: false, confidence: 0 };
  }

  /**
   * Detects follow-up using reply patterns
   */
  private async detectByReplyPattern(email: InboundEmail): Promise<FollowupDetectionResult> {
    const body = email.body.toLowerCase();
    const subject = email.subject.toLowerCase();

    // Check for common reply patterns
    const replyPatterns = [
      /thank you for your response/i,
      /thanks for the auto.*response/i,
      /i received your automated response/i,
      /regarding your support ticket/i,
      /about the ticket you created/i
    ];

    let hasReplyPattern = false;
    for (const pattern of replyPatterns) {
      if (pattern.test(body) || pattern.test(subject)) {
        hasReplyPattern = true;
        break;
      }
    }

    if (hasReplyPattern) {
      // Look for recent auto-responses to this email address
      const recentResponses = await prisma.autoResponse.findMany({
        where: {
          toEmail: email.from,
          sentAt: {
            gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
          }
        },
        orderBy: { sentAt: 'desc' },
        take: 3
      });

      if (recentResponses.length > 0) {
        return {
          isFollowup: true,
          autoResponseId: recentResponses[0].id,
          ticketId: recentResponses[0].ticketId,
          confidence: 0.4,
          reason: 'Reply pattern detected with recent auto-response'
        };
      }
    }

    return { isFollowup: false, confidence: 0 };
  }

  /**
   * Records a follow-up email
   */
  async recordFollowup(
    autoResponseId: string,
    ticketId: string,
    email: InboundEmail,
    status: FollowupStatus = FollowupStatus.PROCESSED
  ): Promise<EmailFollowup> {
    try {
      return await prisma.emailFollowup.create({
        data: {
          autoResponseId,
          ticketId,
          originalEmailId: email.id,
          followupEmailId: email.messageId || email.id,
          content: email.body,
          status
        }
      });
    } catch (error) {
      console.error('Error recording follow-up:', error);
      throw error;
    }
  }

  /**
   * Gets follow-ups for a ticket
   */
  async getTicketFollowups(ticketId: string): Promise<EmailFollowup[]> {
    try {
      return await prisma.emailFollowup.findMany({
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
    } catch (error) {
      console.error('Error fetching ticket follow-ups:', error);
      return [];
    }
  }

  /**
   * Gets follow-ups for an auto-response
   */
  async getAutoResponseFollowups(autoResponseId: string): Promise<EmailFollowup[]> {
    try {
      return await prisma.emailFollowup.findMany({
        where: { autoResponseId },
        orderBy: { processedAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching auto-response follow-ups:', error);
      return [];
    }
  }
}

export const followupDetectionService = new FollowupDetectionService();

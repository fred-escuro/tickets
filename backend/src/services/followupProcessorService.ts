import { prisma } from '../index';
import { Comment, Ticket, User, FollowupStatus } from '@prisma/client';
import { followupDetectionService, InboundEmail } from './followupDetectionService';
import { emailNotificationService } from './emailNotificationService';
import { ParsedMail } from 'mailparser';
import fs from 'fs';
import path from 'path';

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
  async processFollowup(email: InboundEmail, parsedEmail?: ParsedMail): Promise<FollowupProcessingResult> {
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
    const cleanedContent = this.parseFollowupContent(email, parsedEmail);
    
    // Log the cleaning process for debugging
    console.log('=== FOLLOW-UP CONTENT DEBUG ===');
    console.log('Email ID:', email.id);
    console.log('Email From:', email.from);
    console.log('Email Subject:', email.subject);
    console.log('Original body length:', email.body?.length || 0);
    console.log('Original HTML body length:', email.htmlBody?.length || 0);
    console.log('Original body preview:', email.body?.substring(0, 200) + '...');
    console.log('Cleaned content length:', cleanedContent?.length || 0);
    console.log('Cleaned content preview:', cleanedContent?.substring(0, 200) + '...');
    
    // If cleaned content is too short or empty, use original content as fallback
    const finalContent = cleanedContent.trim().length < 10 ? email.body || email.htmlBody || 'No content available' : cleanedContent;
    
    console.log('Final content length:', finalContent?.length || 0);
    console.log('Final content preview:', finalContent?.substring(0, 200) + '...');
    
    if (finalContent !== cleanedContent) {
      console.log('Using fallback content due to aggressive filtering');
    }
    
    if (finalContent.trim().length < 10) {
      console.log('WARNING: Final content is still too short!');
      console.log('Final content:', JSON.stringify(finalContent));
    }
    
    console.log('=== END FOLLOW-UP CONTENT DEBUG ===');

      // Add comment to ticket
      const comment = await this.addCommentToTicket(
        detection.ticketId,
        finalContent,
        email.from,
        false // Not internal
      );

      // Save attachments if we have parsed email data
      if (parsedEmail && parsedEmail.attachments && parsedEmail.attachments.length > 0) {
        await this.saveFollowupAttachments(parsedEmail, comment.id, email.from);
      }

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
  private parseFollowupContent(email: InboundEmail, parsedEmail?: ParsedMail): string {
    console.log('=== PARSE FOLLOW-UP CONTENT DEBUG ===');
    console.log('Input email body:', email.body?.substring(0, 100) + '...');
    console.log('Input email htmlBody:', email.htmlBody?.substring(0, 100) + '...');
    console.log('Parsed email HTML:', typeof parsedEmail?.html === 'string' ? parsedEmail.html.substring(0, 100) + '...' : 'No HTML content');
    
    // Prefer HTML content if available, otherwise use text
    let content = email.htmlBody || email.body;
    
    // If we have parsed email data, use the processed HTML
    if (parsedEmail && parsedEmail.html) {
      content = parsedEmail.html;
      console.log('Using parsed email HTML content');
    } else {
      console.log('Using original email body/htmlBody content');
    }
    
    console.log('Selected content preview:', content?.substring(0, 200) + '...');
    
    // If content appears to be HTML, preserve it
    const isHtml = content.includes('<') && content.includes('>');
    console.log('Content is HTML:', isHtml);
    
    let result: string;
    if (isHtml) {
      // For HTML content, we'll clean it but preserve the HTML structure
      result = this.cleanHtmlContent(content);
      console.log('HTML cleaning result preview:', result?.substring(0, 200) + '...');
      
      // If HTML processing resulted in very short content, try using the plain text body
      if (result.length < 20) {
        console.log('HTML processing resulted in short content, trying plain text body');
        const plainTextResult = this.convertPlainTextToHtml(email.body || '');
        if (plainTextResult.length > result.length) {
          console.log('Using plain text body instead');
          result = plainTextResult;
        }
      }
    } else {
      // For plain text content, convert to HTML for proper display in timeline
      result = this.convertPlainTextToHtml(content);
      console.log('Plain text conversion result preview:', result?.substring(0, 200) + '...');
    }
    
    console.log('Final parse result length:', result?.length || 0);
    console.log('=== END PARSE FOLLOW-UP CONTENT DEBUG ===');
    
    return result;
  }

  /**
   * Removes auto-response content from follow-up emails
   */
  private removeAutoResponseContent(content: string): string {
    console.log('=== REMOVE AUTO-RESPONSE CONTENT DEBUG ===');
    console.log('Input content length:', content?.length || 0);
    console.log('Input content preview:', content?.substring(0, 200) + '...');
    
    // Auto-response specific patterns to remove (more conservative approach)
    const autoResponsePatterns = [
      // Full auto-response patterns (must match entire content)
      /^Thank you for contacting.*?Support Team.*$/s,
      /^We have received your request.*?Support Team.*$/s,
      /^Your ticket has been created.*?Support Team.*$/s,
      /^Ticket #\d+ has been created.*?Support Team.*$/s,
      
      // Auto-response body content (full patterns)
      /^Our support team will review your request.*$/s,
      /^You can track the progress of your ticket.*$/s,
      /^If you have any additional information.*$/s,
      /^Please do not reply to this email.*$/s,
      /^This email was sent automatically.*$/s,
      /^This is an automated response.*$/s,
      
      // TicketHub specific full patterns
      /^TicketHub Support Team.*$/s,
      /^Best regards,\s*Support Team.*$/s,
      /^Best regards,\s*TicketHub.*$/s
    ];

    let cleanedContent = content;
    let removedPatterns = 0;
    
    for (const pattern of autoResponsePatterns) {
      const beforeLength = cleanedContent.length;
      cleanedContent = cleanedContent.split(pattern)[0];
      if (cleanedContent.length < beforeLength) {
        removedPatterns++;
        console.log('Removed auto-response pattern:', pattern.toString());
      }
    }

    console.log('Removed patterns count:', removedPatterns);
    console.log('After pattern removal length:', cleanedContent?.length || 0);
    console.log('After pattern removal preview:', cleanedContent?.substring(0, 200) + '...');

    // More conservative line-by-line filtering
    const lines = cleanedContent.split('\n');
    const filteredLines = [];
    let inAutoResponse = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Only mark as auto-response if it's a clear auto-response start
      if (line.match(/^(Thank you for contacting our support team|We have received your request and created ticket|Your ticket has been created|Ticket #\d+ has been created|RE: .+ - Ticket #\d+)/)) {
        inAutoResponse = true;
        console.log('Detected auto-response start at line:', i, line);
        continue;
      }
      
      // End auto-response only on clear endings
      if (inAutoResponse && line.match(/^(Best regards,\s*Support Team|Best regards,\s*TicketHub|Support Team|Thank you for using our support system)/)) {
        inAutoResponse = false;
        console.log('Detected auto-response end at line:', i, line);
        continue;
      }
      
      // If we're not in an auto-response, keep the line
      if (!inAutoResponse) {
        filteredLines.push(lines[i]);
      }
    }
    
    const result = filteredLines.join('\n').trim();
    console.log('Final filtered content length:', result?.length || 0);
    console.log('Final filtered content preview:', result?.substring(0, 200) + '...');
    console.log('=== END REMOVE AUTO-RESPONSE CONTENT DEBUG ===');
    
    return result;
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
   * Cleans HTML content while preserving formatting for display
   */
  private cleanHtmlContent(htmlContent: string): string {
    console.log('=== CLEAN HTML CONTENT DEBUG ===');
    console.log('Input HTML length:', htmlContent?.length || 0);
    console.log('Input HTML preview:', htmlContent?.substring(0, 200) + '...');
    
    // First, try to extract the actual user content from Microsoft Word HTML
    // Look for the user's message before any auto-response content
    let userContent = this.extractUserContentFromHtml(htmlContent);
    
    if (userContent && userContent.trim().length > 0) {
      console.log('Extracted user content:', userContent);
      return this.convertPlainTextToHtml(userContent);
    }
    
    // If no user content found, proceed with normal HTML cleaning
    console.log('No user content found, proceeding with HTML cleaning');
    
    // Remove auto-response content from HTML
    let cleanedHtml = this.removeAutoResponseContent(htmlContent);
    
    console.log('After auto-response removal length:', cleanedHtml?.length || 0);
    console.log('After auto-response removal preview:', cleanedHtml?.substring(0, 200) + '...');
    
    // Remove quoted content patterns that work with HTML
    const quotedPatterns = [
      // Common email reply patterns in HTML
      /<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>.*$/s,
      /<blockquote[^>]*>.*$/s,
      /<div[^>]*style="[^"]*border-left[^"]*"[^>]*>.*$/s,
      /<!--.*?-->/gs,
      /<div[^>]*class="[^"]*moz-cite-prefix[^"]*"[^>]*>.*$/s,
      /<div[^>]*class="[^"]*OutlookMessageHeader[^"]*"[^>]*>.*$/s,
      /<div[^>]*class="[^"]*WordSection1[^"]*"[^>]*>.*$/s
    ];

    let removedQuotedPatterns = 0;
    for (const pattern of quotedPatterns) {
      const beforeLength = cleanedHtml.length;
      cleanedHtml = cleanedHtml.split(pattern)[0];
      if (cleanedHtml.length < beforeLength) {
        removedQuotedPatterns++;
        console.log('Removed quoted HTML pattern:', pattern.toString());
      }
    }
    
    console.log('Removed quoted patterns count:', removedQuotedPatterns);
    console.log('After quoted removal length:', cleanedHtml?.length || 0);
    console.log('After quoted removal preview:', cleanedHtml?.substring(0, 200) + '...');
    
    // Clean up HTML while preserving formatting
    let formattedHtml = cleanedHtml
      // Remove script and style elements
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      // Clean up Microsoft Word HTML artifacts
      .replace(/<o:p\s*\/?>/gi, '')
      .replace(/<\/o:p>/gi, '')
      .replace(/<w:[^>]*\/?>/gi, '')
      .replace(/<\/w:[^>]*>/gi, '')
      .replace(/xmlns:[^=]*="[^"]*"/gi, '')
      // Normalize line breaks
      .replace(/<br\s*\/?>/gi, '<br>')
      // Clean up empty paragraphs and divs
      .replace(/<p[^>]*>\s*<\/p>/gi, '')
      .replace(/<div[^>]*>\s*<\/div>/gi, '')
      // Ensure proper paragraph structure
      .replace(/<p[^>]*>/gi, '<p>')
      .replace(/<div[^>]*>/gi, '<div>')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('After HTML cleanup length:', formattedHtml?.length || 0);
    console.log('After HTML cleanup preview:', formattedHtml?.substring(0, 200) + '...');
    
    // If content is too short after cleaning, try to extract from original HTML
    if (formattedHtml.length < 50) {
      console.log('Content too short after cleaning, trying original HTML extraction');
      // Try to extract content more aggressively but preserve HTML
      formattedHtml = htmlContent
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<o:p\s*\/?>/gi, '')
        .replace(/<\/o:p>/gi, '')
        .replace(/<w:[^>]*\/?>/gi, '')
        .replace(/<\/w:[^>]*>/gi, '')
        .replace(/xmlns:[^=]*="[^"]*"/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // If still no meaningful HTML content, convert to HTML from plain text
    if (formattedHtml.length < 10 || !formattedHtml.includes('<')) {
      console.log('Still no meaningful content, converting to HTML from plain text');
      const plainText = htmlContent
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      
      // Convert plain text to HTML with proper formatting
      formattedHtml = plainText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => `<p>${line}</p>`)
        .join('');
    }
    
    console.log('Final formatted HTML length:', formattedHtml?.length || 0);
    console.log('Final formatted HTML preview:', formattedHtml?.substring(0, 200) + '...');
    console.log('=== END CLEAN HTML CONTENT DEBUG ===');
    
    return formattedHtml;
  }

  /**
   * Extracts user content from Microsoft Word HTML emails
   */
  private extractUserContentFromHtml(htmlContent: string): string {
    console.log('=== EXTRACT USER CONTENT FROM HTML DEBUG ===');
    
    // First, try to find the user's message by looking for common patterns
    // that appear before auto-response content
    
    // Look for simple user messages at the beginning
    const simplePatterns = [
      /^[^<]*?(Followup please|Thank you|Please|Update|Status|Hi|Hello|I need|Can you|When will)[^<]*/i,
      /^[^<]*?([A-Z][a-z]+ [a-z]+)[^<]*/i, // Simple sentence patterns
    ];
    
    for (const pattern of simplePatterns) {
      const match = htmlContent.match(pattern);
      if (match && match[0].trim().length > 0 && match[0].trim().length < 100) {
        console.log('Found simple user message:', match[0].trim());
        return match[0].trim();
      }
    }
    
    // Try to extract text content and look for user message
    const textContent = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Extracted text content:', textContent.substring(0, 200) + '...');
    
    // Look for user message patterns in the text
    const userMessagePatterns = [
      /^(Followup please|Thank you|Please|Update|Status|Hi|Hello|I need|Can you|When will).*$/i,
      /^([A-Z][a-z]+ [a-z]+.*?)(?=From:|Sent:|To:|Subject:|-----|Best regards|Support Team)/i,
    ];
    
    for (const pattern of userMessagePatterns) {
      const match = textContent.match(pattern);
      if (match && match[1] && match[1].trim().length > 0 && match[1].trim().length < 200) {
        console.log('Found user message pattern:', match[1].trim());
        return match[1].trim();
      }
    }
    
    // If no specific pattern found, try to get the first meaningful line
    const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (const line of lines) {
      if (line.length > 0 && line.length < 100 && 
          !line.match(/^(From:|Sent:|To:|Subject:|Date:|-----|Best regards|Support Team)/i)) {
        console.log('Found first meaningful line:', line);
        return line;
      }
    }
    
    console.log('No user content found in HTML');
    console.log('=== END EXTRACT USER CONTENT FROM HTML DEBUG ===');
    return '';
  }

  /**
   * Converts plain text content to HTML for proper display
   */
  private convertPlainTextToHtml(plainText: string): string {
    console.log('=== CONVERT PLAIN TEXT TO HTML DEBUG ===');
    console.log('Input plain text length:', plainText?.length || 0);
    console.log('Input plain text preview:', plainText?.substring(0, 200) + '...');
    
    // Remove auto-response content from plain text
    let cleanedText = this.removeAutoResponseContent(plainText);
    
    console.log('After auto-response removal length:', cleanedText?.length || 0);
    console.log('After auto-response removal preview:', cleanedText?.substring(0, 200) + '...');
    
    // Remove quoted content patterns (more conservative)
    const quotedPatterns = [
      /On .+ wrote:.*$/s,
      /From: .+ Sent: .+ To: .+ Subject: .+$/s,
      /-----Original Message-----.*$/s,
      /Begin forwarded message:.*$/s,
      /From: .+ Date: .+ Subject: .+$/s,
      /Sent: .+ To: .+ Subject: .+$/s,
    ];

    let removedQuotedPatterns = 0;
    for (const pattern of quotedPatterns) {
      const beforeLength = cleanedText.length;
      cleanedText = cleanedText.split(pattern)[0];
      if (cleanedText.length < beforeLength) {
        removedQuotedPatterns++;
        console.log('Removed quoted pattern:', pattern.toString());
      }
    }
    
    console.log('Removed quoted patterns count:', removedQuotedPatterns);
    console.log('After quoted removal length:', cleanedText?.length || 0);
    console.log('After quoted removal preview:', cleanedText?.substring(0, 200) + '...');
    
    // If content is too short after cleaning, use original text
    if (cleanedText.trim().length < 5) {
      console.log('Content too short after cleaning, using original text');
      cleanedText = plainText;
    }
    
    // Convert plain text to HTML with proper formatting
    const htmlContent = cleanedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Handle special formatting patterns
        if (line.startsWith('--- ')) {
          return `<hr><p><strong>${line.substring(4)}</strong></p>`;
        }
        if (line.includes(':') && line.split(':').length === 2) {
          const [label, value] = line.split(':');
          return `<p><strong>${label.trim()}:</strong> ${value.trim()}</p>`;
        }
        if (line.startsWith('- ')) {
          return `<p>• ${line.substring(2)}</p>`;
        }
        return `<p>${line}</p>`;
      })
      .join('');
    
    const result = htmlContent || '<p>No content available</p>';
    console.log('Final HTML content length:', result?.length || 0);
    console.log('Final HTML content preview:', result?.substring(0, 200) + '...');
    console.log('=== END CONVERT PLAIN TEXT TO HTML DEBUG ===');
    
    return result;
  }

  /**
   * Saves attachments from follow-up emails
   */
  private async saveFollowupAttachments(parsedEmail: ParsedMail, commentId: string, authorEmail: string): Promise<void> {
    try {
      const uploadPath = process.env.UPLOAD_PATH || path.resolve(process.cwd(), 'uploads');
      
      // Ensure upload directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      // Filter out inline images - only save true attachments
      const trueAttachments = (parsedEmail.attachments || []).filter(att => {
        return att.contentDisposition === 'attachment';
      });
      
      console.log(`Processing ${parsedEmail.attachments?.length || 0} total parts, saving ${trueAttachments.length} as follow-up attachments`);
      
      // Find or create user for the author
      let author = await prisma.user.findUnique({
        where: { email: authorEmail }
      });

      if (!author) {
        author = await prisma.user.create({
          data: {
            email: authorEmail,
            firstName: authorEmail.split('@')[0],
            lastName: 'User',
            password: 'external-user',
            isAgent: false
          }
        });
      }
      
      for (const att of trueAttachments) {
        const ext = att.filename ? path.extname(att.filename) : '';
        const safeName = (att.filename || 'attachment')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(0, 120);
        const fname = `followup-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ''}`;
        const fpath = path.join(uploadPath, fname);
        
        fs.writeFileSync(fpath, att.content as Buffer);
        
        await prisma.attachment.create({
          data: {
            ticketId: null, // Attached to comment, not ticket directly
            commentId: commentId,
            name: safeName || fname,
            filePath: fpath,
            fileSize: (att.size as number) || (att.content as Buffer).length,
            mimeType: att.contentType || 'application/octet-stream',
            uploadedBy: author.id,
          },
        });
      }
    } catch (error) {
      console.error('Error saving follow-up attachments:', error);
      // Don't throw - attachments are not critical for follow-up processing
    }
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

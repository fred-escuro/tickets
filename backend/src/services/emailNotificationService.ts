import { emailTrackingService } from './emailTrackingService';
import { EmailMessageType } from '@prisma/client';
import { prisma } from '../index';

export interface EmailNotificationOptions {
  ticketId?: string;
  userId?: string;
  type?: EmailMessageType;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  originalEmailId?: string; // ID of the original email being replied to
  includeOriginalContent?: boolean; // Override global setting
  includeAllRecipients?: boolean; // Override global setting
}

export class EmailNotificationService {
  /**
   * Send a ticket notification email
   */
  async sendTicketNotification(
    to: string | string[],
    subject: string,
    content: {
      text: string;
      html: string;
    },
    options: EmailNotificationOptions = {}
  ): Promise<string> {
    // Get email response settings
    const emailSettings = await this.getEmailResponseSettings();
    
    // Determine if we should include original content
    const includeOriginalContent = options.includeOriginalContent !== undefined 
      ? options.includeOriginalContent 
      : emailSettings.includeOriginalContent;
    
    // Determine if we should include all recipients
    const includeAllRecipients = options.includeAllRecipients !== undefined 
      ? options.includeAllRecipients 
      : emailSettings.includeAllRecipients;
    
    let finalContent = content;
    let finalRecipients = to;
    
    // Include original content if requested and original email ID provided
    if (includeOriginalContent && options.originalEmailId) {
      const originalEmail = await this.getOriginalEmail(options.originalEmailId);
      if (originalEmail) {
        finalContent = this.appendOriginalContent(content, originalEmail);
      }
    }
    
    // Include all recipients if requested and original email ID provided
    if (includeAllRecipients && options.originalEmailId) {
      const originalEmail = await this.getOriginalEmail(options.originalEmailId);
      if (originalEmail) {
        finalRecipients = this.buildRecipientList(to, originalEmail);
      }
    }
    
    return emailTrackingService.sendEmail({
      to: finalRecipients,
      subject,
      text: finalContent.text,
      html: finalContent.html,
      options: {
        ...options,
        type: options.type || EmailMessageType.NEW,
      },
    });
  }

  /**
   * Send follow-up notification to agent
   */
  async sendFollowupNotification(data: {
    agentEmail: string;
    agentName: string;
    ticketId: string;
    ticketTitle: string;
    customerEmail: string;
    followupContent: string;
    ticketUrl: string;
  }): Promise<string> {
    const subject = `[Follow-up] Ticket #${data.ticketId} - ${data.ticketTitle}`;
    
    const text = `Hello ${data.agentName},

A customer has replied to an auto-response on ticket #${data.ticketId}.

Ticket: ${data.ticketTitle}
Customer: ${data.customerEmail}

Follow-up content:
${data.followupContent}

View ticket: ${data.ticketUrl}

Best regards,
TicketHub Support System`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Follow-up Received</h2>
        <p>Hello ${data.agentName},</p>
        <p>A customer has replied to an auto-response on ticket <strong>#${data.ticketId}</strong>.</p>
        
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Ticket Details</h3>
          <p><strong>Ticket:</strong> ${data.ticketTitle}</p>
          <p><strong>Customer:</strong> ${data.customerEmail}</p>
        </div>
        
        <div style="background: #fff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Follow-up Content</h3>
          <div style="white-space: pre-wrap;">${data.followupContent}</div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ticketUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Ticket
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          TicketHub Support System
        </p>
      </div>
    `;

    return this.sendTicketNotification(
      data.agentEmail,
      subject,
      { text, html },
      {
        ticketId: data.ticketId,
        type: EmailMessageType.FOLLOWUP
      }
    );
  }

  /**
   * Send ticket created notification
   */
  async sendTicketCreatedNotification(
    ticketNumber: number,
    ticketTitle: string,
    submitterEmail: string,
    assignedToEmail?: string,
    ticketId?: string
  ): Promise<string> {
    const subject = `[Ticket #${ticketNumber}] ${ticketTitle}`;
    const text = `A new ticket has been created:

Ticket #${ticketNumber}: ${ticketTitle}

This ticket has been submitted and will be reviewed by our support team.

Thank you for contacting us.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Ticket Created</h2>
        <p>Ticket #${ticketNumber}: <strong>${ticketTitle}</strong></p>
        <p>This ticket has been submitted and will be reviewed by our support team.</p>
        <p>Thank you for contacting us.</p>
      </div>
    `;

    const recipients = [submitterEmail];
    if (assignedToEmail && assignedToEmail !== submitterEmail) {
      recipients.push(assignedToEmail);
    }

    return this.sendTicketNotification(
      recipients,
      subject,
      { text, html },
      {
        ticketId,
        type: EmailMessageType.NEW,
      }
    );
  }

  /**
   * Send automatic response to new ticket
   */
  async sendAutomaticResponse(
    ticketId: string,
    ticketNumber: number,
    ticketTitle: string,
    submitterEmail: string,
    originalContent?: string
  ): Promise<string> {
    try {
      // Get automatic response settings
      const settings = await this.getAutoResponseSettings();
      
      if (!settings.enabled) {
        throw new Error('Automatic responses are disabled');
      }

      // Get ticket details for template
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          category: true,
          priority: true,
          submitter: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Process original content if included
      let processedOriginalContent = '';
      if (settings.includeOriginalContent && originalContent) {
        // Truncate content if needed
        if (originalContent.length > settings.contentTruncationLength) {
          processedOriginalContent = originalContent.substring(0, settings.contentTruncationLength) + '... [Content truncated]';
        } else {
          processedOriginalContent = originalContent;
        }
      }

      // Replace template variables
      const subject = this.replaceTemplateVariables(settings.subjectTemplate, {
        ticketNumber: ticketNumber.toString(),
        ticketTitle: ticketTitle,
        priority: ticket.priority?.name || 'Medium',
        category: ticket.category?.name || 'General',
        submitterName: `${ticket.submitter.firstName} ${ticket.submitter.lastName}`,
        originalContent: processedOriginalContent
      });

      const content = this.replaceTemplateVariables(settings.responseTemplate, {
        ticketNumber: ticketNumber.toString(),
        ticketTitle: ticketTitle,
        priority: ticket.priority?.name || 'Medium',
        category: ticket.category?.name || 'General',
        submitterName: `${ticket.submitter.firstName} ${ticket.submitter.lastName}`,
        originalContent: processedOriginalContent,
        includeOriginalContent: settings.includeOriginalContent
      });

      // Convert to HTML
      const html = this.convertTextToHtml(content);

      return this.sendTicketNotification(
        submitterEmail,
        subject,
        { text: content, html },
        {
          ticketId,
          type: EmailMessageType.REPLY,
          replyTo: submitterEmail
        }
      );
    } catch (error) {
      console.error('Failed to send automatic response:', error);
      throw error;
    }
  }

  /**
   * Get email response settings
   */
  private async getEmailResponseSettings() {
    const settings = await prisma.appSetting.findMany({
      where: {
        namespace: 'email.responses',
        key: {
          in: [
            'include_original_content',
            'include_all_recipients',
            'include_cc_recipients',
            'include_bcc_recipients'
          ]
        }
      }
    });

    const defaultSettings = {
      includeOriginalContent: true,
      includeAllRecipients: false,
      includeCcRecipients: true,
      includeBccRecipients: false
    };

    const result = { ...defaultSettings };

    settings.forEach((setting: any) => {
      switch (setting.key) {
        case 'include_original_content':
          result.includeOriginalContent = setting.value === true || setting.value === 'true';
          break;
        case 'include_all_recipients':
          result.includeAllRecipients = setting.value === true || setting.value === 'true';
          break;
        case 'include_cc_recipients':
          result.includeCcRecipients = setting.value === true || setting.value === 'true';
          break;
        case 'include_bcc_recipients':
          result.includeBccRecipients = setting.value === true || setting.value === 'true';
          break;
      }
    });

    return result;
  }

  /**
   * Get original email by ID
   */
  private async getOriginalEmail(emailId: string) {
    try {
      return await prisma.emailLog.findUnique({
        where: { id: emailId }
      });
    } catch (error) {
      console.error('Error fetching original email:', error);
      return null;
    }
  }

  /**
   * Append original email content to response
   */
  private appendOriginalContent(content: { text: string; html: string }, originalEmail: any): { text: string; html: string } {
    const originalContentText = originalEmail.body || originalEmail.htmlBody || '';
    const originalSubject = originalEmail.subject || '';
    const originalFrom = originalEmail.from || '';
    const originalDate = originalEmail.receivedAt || originalEmail.sentAt || new Date();
    
    const formattedDate = originalDate.toLocaleString();
    
    // Format original content for text
    const originalTextBlock = `\n\n--- Original Message ---\nFrom: ${originalFrom}\nDate: ${formattedDate}\nSubject: ${originalSubject}\n\n${originalContentText}`;
    
    // Format original content for HTML
    const originalHtmlBlock = `
      <div style="margin-top: 20px; padding: 15px; border-left: 3px solid #ccc; background-color: #f9f9f9;">
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
          <strong>--- Original Message ---</strong>
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
          <strong>From:</strong> ${originalFrom}<br>
          <strong>Date:</strong> ${formattedDate}<br>
          <strong>Subject:</strong> ${originalSubject}
        </div>
        <div style="white-space: pre-wrap; font-family: monospace; font-size: 13px;">
          ${originalContentText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      </div>
    `;
    
    return {
      text: content.text + originalTextBlock,
      html: content.html + originalHtmlBlock
    };
  }

  /**
   * Build recipient list including original email recipients
   */
  private buildRecipientList(primaryRecipients: string | string[], originalEmail: any): string | string[] {
    const recipients = new Set<string>();
    
    // Add primary recipients
    if (Array.isArray(primaryRecipients)) {
      primaryRecipients.forEach(email => recipients.add(email));
    } else {
      recipients.add(primaryRecipients);
    }
    
    // Add original email recipients
    if (originalEmail.from) {
      // Extract email from "Name <email@domain.com>" format
      const fromEmail = this.extractEmailFromAddress(originalEmail.from);
      if (fromEmail) recipients.add(fromEmail);
    }
    
    if (originalEmail.to) {
      const toEmails = originalEmail.to.split(',').map((email: string) => email.trim());
      toEmails.forEach((email: string) => {
        const cleanEmail = this.extractEmailFromAddress(email);
        if (cleanEmail) recipients.add(cleanEmail);
      });
    }
    
    return Array.from(recipients);
  }

  /**
   * Extract email address from formatted address string
   */
  private extractEmailFromAddress(address: string): string | null {
    if (!address) return null;
    
    // Handle "Name <email@domain.com>" format
    const match = address.match(/<([^>]+)>/);
    if (match) {
      return match[1].trim();
    }
    
    // Handle plain email format
    if (address.includes('@')) {
      return address.trim();
    }
    
    return null;
  }

  /**
   * Get automatic response settings
   */
  private async getAutoResponseSettings() {
    const settings = await prisma.appSetting.findMany({
      where: {
        namespace: 'system',
        key: {
          in: [
            'auto_response_enabled',
            'auto_response_content_truncation_length',
            'auto_response_template',
            'auto_response_subject_template'
          ]
        }
      }
    });

    // Get original content setting from email.responses namespace
    const emailResponseSettings = await prisma.appSetting.findMany({
      where: {
        namespace: 'email.responses',
        key: 'include_original_content'
      }
    });

    const defaultSettings = {
      enabled: true,
      includeOriginalContent: true,
      contentTruncationLength: 500,
      responseTemplate: `Thank you for contacting our support team. We have received your ticket and will review it shortly.

Ticket Details:
- Ticket Number: {{ticketNumber}}
- Subject: {{ticketTitle}}
- Priority: {{priority}}
- Category: {{category}}

{{#includeOriginalContent}}
Original Message:
{{originalContent}}
{{/includeOriginalContent}}

Our support team will get back to you as soon as possible. You can track the progress of your ticket by logging into our support portal.

Best regards,
Support Team`,
      subjectTemplate: 'Re: {{ticketTitle}} - Ticket #{{ticketNumber}}'
    };

    const result = { ...defaultSettings };

    settings.forEach((setting: any) => {
      switch (setting.key) {
        case 'auto_response_enabled':
          result.enabled = setting.value === true || setting.value === 'true';
          break;
        case 'auto_response_content_truncation_length':
          result.contentTruncationLength = parseInt(String(setting.value)) || 500;
          break;
        case 'auto_response_template':
          result.responseTemplate = String(setting.value) || defaultSettings.responseTemplate;
          break;
        case 'auto_response_subject_template':
          result.subjectTemplate = String(setting.value) || defaultSettings.subjectTemplate;
          break;
      }
    });

    // Handle original content setting from email.responses namespace
    emailResponseSettings.forEach((setting: any) => {
      if (setting.key === 'include_original_content') {
        result.includeOriginalContent = setting.value === true || setting.value === 'true';
      }
    });

    return result;
  }

  /**
   * Replace template variables in text
   */
  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace simple variables
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      if (typeof value === 'string' || typeof value === 'number') {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    });

    // Handle conditional blocks
    result = result.replace(/\{\{#includeOriginalContent\}\}([\s\S]*?)\{\{\/includeOriginalContent\}\}/g, (match, content) => {
      return variables.includeOriginalContent ? content : '';
    });

    return result;
  }

  /**
   * Convert plain text to HTML
   */
  private convertTextToHtml(text: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        ${text
          .replace(/\n\n/g, '</p><p style="margin: 1em 0;">')
          .replace(/\n/g, '<br>')
          .replace(/^/, '<p style="margin: 1em 0;">')
          .replace(/$/, '</p>')}
      </div>
    `;
  }

  /**
   * Send ticket updated notification
   */
  async sendTicketUpdatedNotification(
    ticketNumber: number,
    ticketTitle: string,
    recipientEmail: string,
    updateMessage: string,
    ticketId?: string
  ): Promise<string> {
    const subject = `[Ticket #${ticketNumber}] Updated: ${ticketTitle}`;
    const text = `Ticket #${ticketNumber} has been updated:

${updateMessage}

Please log in to view the full details.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Ticket Updated</h2>
        <p><strong>Ticket #${ticketNumber}:</strong> ${ticketTitle}</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 12px 0;">
          ${updateMessage}
        </div>
        <p>Please log in to view the full details.</p>
      </div>
    `;

    return this.sendTicketNotification(
      recipientEmail,
      subject,
      { text, html },
      {
        ticketId,
        type: EmailMessageType.REPLY,
      }
    );
  }

  /**
   * Send ticket resolved notification
   */
  async sendTicketResolvedNotification(
    ticketNumber: number,
    ticketTitle: string,
    recipientEmail: string,
    resolution: string,
    ticketId?: string
  ): Promise<string> {
    const subject = `[Ticket #${ticketNumber}] Resolved: ${ticketTitle}`;
    const text = `Ticket #${ticketNumber} has been resolved:

Resolution:
${resolution}

Thank you for using our support system.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Ticket Resolved</h2>
        <p><strong>Ticket #${ticketNumber}:</strong> ${ticketTitle}</p>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; margin: 12px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 8px 0; color: #065f46;">Resolution:</h3>
          <p style="margin: 0;">${resolution}</p>
        </div>
        <p>Thank you for using our support system.</p>
      </div>
    `;

    return this.sendTicketNotification(
      recipientEmail,
      subject,
      { text, html },
      {
        ticketId,
        type: EmailMessageType.REPLY,
      }
    );
  }

  /**
   * Send comment notification
   */
  async sendCommentNotification(
    ticketNumber: number,
    ticketTitle: string,
    recipientEmail: string,
    comment: string,
    commenterName: string,
    ticketId?: string
  ): Promise<string> {
    const subject = `[Ticket #${ticketNumber}] New Comment: ${ticketTitle}`;
    const text = `A new comment has been added to ticket #${ticketNumber}:

From: ${commenterName}

${comment}

Please log in to view the full conversation.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Comment Added</h2>
        <p><strong>Ticket #${ticketNumber}:</strong> ${ticketTitle}</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 12px 0;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">From: ${commenterName}</p>
          <p style="margin: 0;">${comment}</p>
        </div>
        <p>Please log in to view the full conversation.</p>
      </div>
    `;

    return this.sendTicketNotification(
      recipientEmail,
      subject,
      { text, html },
      {
        ticketId,
        type: EmailMessageType.REPLY,
      }
    );
  }

  /**
   * Send SLA breach notification
   */
  async sendSLABreachNotification(
    ticketNumber: number,
    ticketTitle: string,
    recipientEmail: string,
    breachType: 'response' | 'resolution',
    ticketId?: string
  ): Promise<string> {
    const subject = `[URGENT] SLA Breach - Ticket #${ticketNumber}`;
    const text = `URGENT: SLA ${breachType} time has been exceeded for ticket #${ticketNumber}.

Ticket: ${ticketTitle}

This ticket requires immediate attention to meet our service level agreements.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626; background: #fef2f2; padding: 12px; border-radius: 6px; margin: 0 0 16px 0;">
          ⚠️ SLA Breach Alert
        </h2>
        <p><strong>Ticket #${ticketNumber}:</strong> ${ticketTitle}</p>
        <p style="color: #dc2626; font-weight: 600;">
          SLA ${breachType} time has been exceeded. This ticket requires immediate attention.
        </p>
      </div>
    `;

    return this.sendTicketNotification(
      recipientEmail,
      subject,
      { text, html },
      {
        ticketId,
        type: EmailMessageType.NEW,
      }
    );
  }
}

export const emailNotificationService = new EmailNotificationService();

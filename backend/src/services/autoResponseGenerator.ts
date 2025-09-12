import { PrismaClient } from '@prisma/client';
import { autoResponseService } from './autoResponseService';
import { 
  AutoResponseTemplate, 
  TemplateVariables, 
  GeneratedAutoResponse,
  AutoResponseStatus
} from '../types/autoResponse';
import { emailTrackingService } from './emailTrackingService';

const prisma = new PrismaClient();

export class AutoResponseGenerator {
  /**
   * Select the most appropriate template for a ticket and email
   */
  async selectTemplate(ticket: any, email: any): Promise<AutoResponseTemplate | null> {
    try {
      return await autoResponseService.selectTemplateForTicket(ticket, email);
    } catch (error) {
      console.error('Error selecting template:', error);
      return null;
    }
  }

  /**
   * Generate auto-response content using template and variables
   */
  async generateResponse(template: AutoResponseTemplate, ticket: any, email: any): Promise<GeneratedAutoResponse> {
    try {
      // Generate template variables
      const variables = autoResponseService.generateTemplateVariables(ticket, email);
      
      // Render the template
      const generated = autoResponseService.renderTemplate(template, variables);
      
      return generated;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  /**
   * Send the auto-response email
   */
  async sendResponse(
    generated: GeneratedAutoResponse, 
    ticket: any, 
    template: AutoResponseTemplate,
    toEmail: string,
    email: any
  ): Promise<any> {
    try {
      // Get email response settings
      const emailSettings = await this.getEmailResponseSettings();
      
      // Add response ID to the email content for follow-up tracking
      const responseIdText = `\n\n---\n[Response-ID: ${generated.responseId}]\n[Ticket: ${ticket.ticketNumber}]`;
      let enhancedBody = generated.body + responseIdText;
      const enhancedSubject = generated.subject + ` [Response-ID: ${generated.responseId}]`;

      // Include original content if enabled
      if (emailSettings.includeOriginalContent && email.body) {
        const originalContentText = email.body || email.htmlBody || '';
        const originalSubject = email.subject || '';
        const originalFrom = email.from || '';
        const originalDate = email.receivedAt || email.sentAt || new Date();
        
        const formattedDate = originalDate.toLocaleString();
        const originalTextBlock = `\n\n--- Original Message ---\nFrom: ${originalFrom}\nDate: ${formattedDate}\nSubject: ${originalSubject}\n\n${originalContentText}`;
        
        enhancedBody = generated.body + originalTextBlock + responseIdText;
      }

      // Get system's own email address to exclude it from recipients
      const systemEmailAddress = await this.getSystemEmailAddress();
      
      // Determine recipients
      let finalRecipients: string | string[] = toEmail;
      let ccRecipients: string[] = [];
      
      if (emailSettings.includeAllRecipients) {
        const recipients = new Set<string>();
        
        // Add primary recipient (but not if it's the system's own email)
        if (toEmail !== systemEmailAddress) {
          recipients.add(toEmail);
        }
        
        // Add original email recipients (excluding system's own email)
        if (email.from) {
          const fromEmail = this.extractEmailFromAddress(email.from);
          if (fromEmail && fromEmail !== systemEmailAddress) {
            recipients.add(fromEmail);
          }
        }
        
        if (email.to) {
          const toEmails = email.to.split(',').map((email: string) => email.trim());
          toEmails.forEach((email: string) => {
            const cleanEmail = this.extractEmailFromAddress(email);
            if (cleanEmail && cleanEmail !== systemEmailAddress) {
              recipients.add(cleanEmail);
            }
          });
        }
        
        finalRecipients = Array.from(recipients);
      }
      
      // Handle CC recipients separately (regardless of includeAllRecipients setting)
      if (emailSettings.includeCcRecipients && email.cc) {
        const ccEmails = email.cc.split(',').map((email: string) => email.trim());
        ccRecipients = ccEmails.map((email: string) => {
          const cleanEmail = this.extractEmailFromAddress(email);
          return cleanEmail;
        }).filter(Boolean).filter((email: string) => email !== systemEmailAddress) as string[];
      }

      // Send the email using the existing email service
      const messageId = await emailTrackingService.sendEmail({
        to: finalRecipients,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        subject: enhancedSubject,
        text: enhancedBody,
        html: this.convertToHtml(enhancedBody),
        options: {
          inReplyTo: email.messageId || undefined,
          references: email.messageId || undefined,
          type: 'REPLY' as any,
        }
      });

      // Log the auto-response in the database
      const autoResponse = await autoResponseService.createResponse({
        ticketId: ticket.id,
        templateId: template.id,
        responseId: generated.responseId,
        toEmail: toEmail,
        subject: generated.subject,
        body: generated.body,
        threadId: generated.threadId,
        status: AutoResponseStatus.SENT,
      });

      return {
        success: true,
        autoResponse,
        messageId: messageId,
        error: null,
      };
    } catch (error) {
      console.error('Error sending auto-response:', error);
      
      // Log failed response
      await autoResponseService.createResponse({
        ticketId: ticket.id,
        templateId: template.id,
        responseId: generated.responseId,
        toEmail: toEmail,
        subject: generated.subject,
        body: generated.body,
        threadId: generated.threadId,
        status: AutoResponseStatus.ERROR,
      });

      throw error;
    }
  }

  /**
   * Process a new ticket and determine if an auto-response should be sent
   */
  async processTicketForAutoResponse(ticket: any, email: any): Promise<boolean> {
    try {
      console.log(`Processing auto-response for ticket ${ticket.ticketNumber} from ${email.from}`);
      
      // Check if auto-responses are enabled
      const autoResponseEnabled = await this.isAutoResponseEnabled();
      if (!autoResponseEnabled) {
        console.log('Auto-response is disabled');
        return false;
      }

      // Check if this ticket already has an auto-response
      const existingResponse = await prisma.autoResponse.findFirst({
        where: {
          ticketId: ticket.id,
        },
      });

      if (existingResponse) {
        console.log(`Ticket ${ticket.ticketNumber} already has an auto-response`);
        return false;
      }

      // Select appropriate template
      console.log(`Selecting template for ticket ${ticket.ticketNumber}`);
      const template = await this.selectTemplate(ticket, email);
      if (!template) {
        console.log(`No suitable template found for ticket ${ticket.ticketNumber}`);
        return false;
      }
      console.log(`Selected template: ${template.name}`);

      // Generate and send response
      const generated = await this.generateResponse(template, ticket, email);
      const result = await this.sendResponse(generated, ticket, template, email.from, email);

      if (result.success) {
        console.log(`Auto-response sent for ticket ${ticket.ticketNumber} using template "${template.name}"`);
        return true;
      } else {
        console.error(`Failed to send auto-response for ticket ${ticket.ticketNumber}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('Error processing ticket for auto-response:', error);
      return false;
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
   * Check if auto-response is enabled in system settings
   */
  private async isAutoResponseEnabled(): Promise<boolean> {
    try {
      const setting = await prisma.appSetting.findFirst({
        where: {
          namespace: 'auto_response',
          key: 'enabled',
        },
      });

      return setting ? (setting.value as boolean) : false;
    } catch (error) {
      console.error('Error checking auto-response setting:', error);
      return false;
    }
  }

  /**
   * Convert plain text to basic HTML
   */
  private convertToHtml(text: string): string {
    if (!text) return '';
    
    // Start with a proper HTML structure
    let html = text
      // Convert line breaks to HTML
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      
      // Convert markdown-style formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Convert ticket details section to a proper list
      .replace(/Ticket Details:\s*\n((?:- .*\n?)*)/g, (match, listItems) => {
        const items = listItems.split('\n')
          .filter((line: string) => line.trim().startsWith('-'))
          .map((line: string) => `<li>${line.replace(/^- /, '')}</li>`)
          .join('');
        return '<h3>Ticket Details:</h3><ul>' + items + '</ul>';
      })
      
      // Convert "Original Message:" section
      .replace(/Original Message:\s*\n/g, '<h3>Original Message:</h3>')
      
      // Convert "Best regards," section
      .replace(/Best regards,\s*\n([^\n]+)/g, '<p><strong>Best regards,</strong><br>$1</p>')
      
      // Convert "Thank you for contacting" to a proper greeting
      .replace(/^(Thank you for contacting[^.]*\.)/gm, '<p><strong>$1</strong></p>')
      
      // Convert paragraphs (double line breaks)
      .replace(/\n\n+/g, '</p><p>')
      
      // Convert single line breaks to <br> tags
      .replace(/\n/g, '<br>')
      
      // Clean up any empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '');
    
    // Wrap in proper HTML structure
    html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p>${html}</p>
    </div>`;
    
    // Clean up any malformed HTML
    html = html
      .replace(/<p><p>/g, '<p>')
      .replace(/<\/p><\/p>/g, '</p>')
      .replace(/<br><\/p>/g, '</p>')
      .replace(/<p><br>/g, '<p>');
    
    return html;
  }

  /**
   * Get auto-response statistics
   */
  async getStatistics(): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    totalResponses: number;
    responsesToday: number;
    successRate: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalTemplates,
        activeTemplates,
        totalResponses,
        responsesToday,
        successfulResponses,
      ] = await Promise.all([
        prisma.autoResponseTemplate.count(),
        prisma.autoResponseTemplate.count({ where: { isActive: true } }),
        prisma.autoResponse.count(),
        prisma.autoResponse.count({
          where: {
            sentAt: {
              gte: today,
            },
          },
        }),
        prisma.autoResponse.count({
          where: {
            status: {
              in: [AutoResponseStatus.SENT, AutoResponseStatus.DELIVERED],
            },
          },
        }),
      ]);

      const successRate = totalResponses > 0 ? (successfulResponses / totalResponses) * 100 : 0;

      return {
        totalTemplates,
        activeTemplates,
        totalResponses,
        responsesToday,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting auto-response statistics:', error);
      return {
        totalTemplates: 0,
        activeTemplates: 0,
        totalResponses: 0,
        responsesToday: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Get the system's own email address from SMTP settings
   */
  private async getSystemEmailAddress(): Promise<string> {
    try {
      const settings = await prisma.appSetting.findMany({
        where: { namespace: 'email.smtp' }
      });
      
      const smtpSettings: any = {};
      settings.forEach(setting => {
        smtpSettings[setting.key] = setting.value;
      });

      return smtpSettings.fromAddress || process.env.SMTP_FROM || 'hd@wesupportinc.com';
    } catch (error) {
      console.error('Error getting system email address:', error);
      return 'hd@wesupportinc.com'; // fallback
    }
  }
}

export const autoResponseGenerator = new AutoResponseGenerator();

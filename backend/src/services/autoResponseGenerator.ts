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
      // Send the email using the existing email service
      const messageId = await emailTrackingService.sendEmail({
        to: toEmail,
        subject: generated.subject,
        text: generated.body,
        html: this.convertToHtml(generated.body),
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
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<p></p>');
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
}

export const autoResponseGenerator = new AutoResponseGenerator();

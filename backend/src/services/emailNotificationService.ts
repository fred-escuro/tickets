import { emailTrackingService } from './emailTrackingService';
import { EmailMessageType } from '@prisma/client';

export interface EmailNotificationOptions {
  ticketId?: string;
  userId?: string;
  type?: EmailMessageType;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
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
    return emailTrackingService.sendEmail({
      to,
      subject,
      text: content.text,
      html: content.html,
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

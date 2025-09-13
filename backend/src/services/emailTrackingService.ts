import nodemailer from 'nodemailer';
import { EmailDirection, EmailStatus, EmailMessageType } from '@prisma/client';

export interface EmailTrackingOptions {
  ticketId?: string;
  userId?: string;
  type?: EmailMessageType;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  trackDelivery?: boolean;
  trackRead?: boolean;
}

export interface OutboundEmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
  options?: EmailTrackingOptions;
}

export interface InboundEmailData {
  messageId: string;
  imapUid?: number;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  text?: string;
  html?: string;
  attachments?: any[];
  receivedAt?: Date;
  rawMeta?: any;
  imap_raw?: string;
  options?: EmailTrackingOptions;
}

export class EmailTrackingService {
  private transporter: nodemailer.Transporter | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Load SMTP settings from database
      const settings = await this.loadSmtpSettings();
      if (settings.host && settings.user && settings.password) {
        this.transporter = nodemailer.createTransport({
          host: settings.host,
          port: settings.port,
          secure: settings.secure,
          auth: {
            user: settings.user,
            pass: settings.password,
          },
        });
        console.log('✅ Email transporter initialized successfully');
      } else {
        console.error('❌ SMTP settings incomplete:', { 
          host: !!settings.host, 
          user: !!settings.user, 
          password: !!settings.password 
        });
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  private async ensureTransporter() {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    if (!this.transporter) {
      // Try to reinitialize if transporter is still null
      await this.initializeTransporter();
    }
  }

  private formatFromAddress(fromAddress: string | undefined, user: string | undefined): string {
    // If fromAddress is already properly formatted, use it
    if (fromAddress && fromAddress.includes('<') && fromAddress.includes('>')) {
      return fromAddress;
    }
    
    // If fromAddress contains a name in parentheses format like "Name (email@domain.com)"
    if (fromAddress && fromAddress.includes('(') && fromAddress.includes(')')) {
      const match = fromAddress.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (match) {
        const name = match[1].trim();
        const email = match[2].trim();
        return `"${name}" <${email}>`;
      }
    }
    
    // If fromAddress is just a name, combine with user email
    if (fromAddress && !fromAddress.includes('@') && user) {
      return `"${fromAddress}" <${user}>`;
    }
    
    // If fromAddress is an email, use it directly
    if (fromAddress && fromAddress.includes('@')) {
      return fromAddress;
    }
    
    // Fallback to user email or default
    return user || 'noreply@example.com';
  }

  private async loadSmtpSettings() {
    const { prisma } = await import('../index');
    const rows = await prisma.appSetting.findMany({
      where: { namespace: 'email.smtp' }
    });
    
    const settings: any = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return {
      host: settings.host || process.env.SMTP_HOST,
      port: Number(settings.port ?? process.env.SMTP_PORT ?? 587),
      secure: Boolean(settings.secure ?? (process.env.SMTP_SECURE === 'true')),
      user: settings.user || process.env.SMTP_USER,
      password: settings.password || process.env.SMTP_PASSWORD,
      fromAddress: settings.fromAddress || process.env.SMTP_FROM,
    };
  }

  /**
   * Send an outbound email and track it
   */
  async sendEmail(emailData: OutboundEmailData): Promise<string> {
    await this.ensureTransporter();
    
    if (!this.transporter) {
      throw new Error('Email transporter not configured');
    }

    const settings = await this.loadSmtpSettings();
    const fromAddress = this.formatFromAddress(settings.fromAddress, settings.user);

    // Create email log entry before sending
    const { prisma } = await import('../index');
    const emailLog = await prisma.emailLog.create({
      data: {
        direction: EmailDirection.OUTBOUND,
        type: emailData.options?.type || EmailMessageType.NEW,
        from: fromAddress,
        to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc.join(', ') : emailData.cc) : null,
        bcc: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc.join(', ') : emailData.bcc) : null,
        subject: emailData.subject,
        body: emailData.text,
        htmlBody: emailData.html,
        ticketId: emailData.options?.ticketId,
        userId: emailData.options?.userId,
        status: EmailStatus.PROCESSING,
        sentAt: new Date(),
        replyTo: emailData.options?.replyTo,
        inReplyTo: emailData.options?.inReplyTo,
        references: emailData.options?.references,
        attachments: emailData.attachments ? JSON.stringify(emailData.attachments) : undefined,
      },
    });

    try {
      // Prepare nodemailer options
      const mailOptions: any = {
        from: fromAddress,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      };

      if (emailData.cc) mailOptions.cc = emailData.cc;
      if (emailData.bcc) mailOptions.bcc = emailData.bcc;
      if (emailData.attachments) mailOptions.attachments = emailData.attachments;
      if (emailData.options?.replyTo) mailOptions.replyTo = emailData.options.replyTo;
      if (emailData.options?.inReplyTo) mailOptions.inReplyTo = emailData.options.inReplyTo;
      if (emailData.options?.references) mailOptions.references = emailData.options.references;

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      // Update email log with success
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          messageId: info.messageId,
          status: EmailStatus.SENT,
          deliveryStatus: {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
            pending: info.pending,
          },
        },
      });

      return emailLog.id;
    } catch (error: any) {
      // Update email log with error
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.FAILED,
          error: error.message,
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  /**
   * Track an inbound email
   */
  async trackInboundEmail(emailData: InboundEmailData): Promise<string> {
    const { prisma } = await import('../index');
    
    // Check if email with this messageId already exists
    if (emailData.messageId) {
      const existingEmailLog = await prisma.emailLog.findUnique({
        where: { messageId: emailData.messageId },
        select: { id: true, status: true }
      });

      if (existingEmailLog) {
        console.log(`📧 Email with messageId ${emailData.messageId} already exists, returning existing ID: ${existingEmailLog.id}`);
        return existingEmailLog.id;
      }
    }

    try {
      const emailLog = await prisma.emailLog.create({
        data: {
          messageId: emailData.messageId,
          imapUid: emailData.imapUid,
          direction: EmailDirection.INBOUND,
          type: emailData.options?.type || EmailMessageType.NEW,
          from: emailData.from,
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          body: emailData.text,
          htmlBody: emailData.html,
          ticketId: emailData.options?.ticketId,
          userId: emailData.options?.userId,
          status: EmailStatus.PROCESSING,
          receivedAt: emailData.receivedAt || new Date(),
          rawMeta: emailData.rawMeta,
          imap_raw: emailData.imap_raw,
          attachments: emailData.attachments ? JSON.stringify(emailData.attachments) : undefined,
          replyTo: emailData.options?.replyTo,
          inReplyTo: emailData.options?.inReplyTo,
          references: emailData.options?.references,
        },
      });

      return emailLog.id;
    } catch (error: any) {
      // Handle unique constraint violation gracefully
      if (error.code === 'P2002' && error.meta?.target?.includes('messageId')) {
        console.log(`⚠️ Duplicate messageId ${emailData.messageId} detected, attempting to find existing record`);
        
        // Try to find the existing record
        const existingEmailLog = await prisma.emailLog.findUnique({
          where: { messageId: emailData.messageId },
          select: { id: true }
        });

        if (existingEmailLog) {
          console.log(`✅ Found existing email log with ID: ${existingEmailLog.id}`);
          return existingEmailLog.id;
        }
      }
      
      // Re-throw if it's not a duplicate constraint error
      throw error;
    }
  }

  /**
   * Update email status
   */
  async updateEmailStatus(
    emailLogId: string,
    status: EmailStatus,
    additionalData?: {
      error?: string;
      deliveryStatus?: any;
      readAt?: Date;
    }
  ): Promise<void> {
    const { prisma } = await import('../index');
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status,
        ...(additionalData?.error && { error: additionalData.error }),
        ...(additionalData?.deliveryStatus && { deliveryStatus: additionalData.deliveryStatus }),
        ...(additionalData?.readAt && { readAt: additionalData.readAt }),
      },
    });
  }

  /**
   * Get email logs with filtering and pagination
   */
  async getEmailLogs(options: {
    direction?: EmailDirection;
    status?: EmailStatus;
    ticketId?: string;
    userId?: string;
    from?: string;
    to?: string;
    subject?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      direction,
      status,
      ticketId,
      userId,
      from,
      to,
      subject,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'processedAt',
      sortOrder = 'desc',
    } = options;

    const where: any = {};

    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (ticketId) where.ticketId = ticketId;
    if (userId) where.userId = userId;
    if (from) where.from = { contains: from, mode: 'insensitive' };
    if (to) where.to = { contains: to, mode: 'insensitive' };
    if (subject) where.subject = { contains: subject, mode: 'insensitive' };
    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) where.processedAt.gte = startDate;
      if (endDate) where.processedAt.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const { prisma } = await import('../index');
    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.emailLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get email statistics
   */
  async getEmailStatistics(options: {
    startDate?: Date;
    endDate?: Date;
    ticketId?: string;
    userId?: string;
  } = {}) {
    const { startDate, endDate, ticketId, userId } = options;

    const where: any = {};
    if (ticketId) where.ticketId = ticketId;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) where.processedAt.gte = startDate;
      if (endDate) where.processedAt.lte = endDate;
    }

    const { prisma } = await import('../index');
    const [
      totalEmails,
      inboundEmails,
      outboundEmails,
      sentEmails,
      failedEmails,
      deliveredEmails,
      bouncedEmails,
    ] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, direction: EmailDirection.INBOUND } }),
      prisma.emailLog.count({ where: { ...where, direction: EmailDirection.OUTBOUND } }),
      prisma.emailLog.count({ where: { ...where, status: EmailStatus.SENT } }),
      prisma.emailLog.count({ where: { ...where, status: EmailStatus.FAILED } }),
      prisma.emailLog.count({ where: { ...where, status: EmailStatus.DELIVERED } }),
      prisma.emailLog.count({ where: { ...where, status: EmailStatus.BOUNCED } }),
    ]);

    return {
      totalEmails,
      inboundEmails,
      outboundEmails,
      sentEmails,
      failedEmails,
      deliveredEmails,
      bouncedEmails,
      successRate: totalEmails > 0 ? ((deliveredEmails + sentEmails) / totalEmails) * 100 : 0,
    };
  }

  /**
   * Get email thread for a ticket
   */
  async getEmailThread(ticketId: string) {
    const { prisma } = await import('../index');
    return prisma.emailLog.findMany({
      where: { ticketId },
      orderBy: { processedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Retry failed email
   */
  async retryEmail(emailLogId: string): Promise<string> {
    const { prisma } = await import('../index');
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      throw new Error('Email log not found');
    }

    if (emailLog.direction !== EmailDirection.OUTBOUND) {
      throw new Error('Can only retry outbound emails');
    }

    if (emailLog.status !== EmailStatus.FAILED) {
      throw new Error('Can only retry failed emails');
    }

    // Prepare email data for retry
    const emailData: OutboundEmailData = {
      to: emailLog.to,
      cc: emailLog.cc || undefined,
      bcc: emailLog.bcc || undefined,
      subject: emailLog.subject || '',
      text: emailLog.body || undefined,
      html: emailLog.htmlBody || undefined,
      attachments: emailLog.attachments ? JSON.parse(emailLog.attachments as string) : undefined,
      options: {
        ticketId: emailLog.ticketId || undefined,
        userId: emailLog.userId || undefined,
        type: emailLog.type,
        replyTo: emailLog.replyTo || undefined,
        inReplyTo: emailLog.inReplyTo || undefined,
        references: emailLog.references || undefined,
      },
    };

    // Send the email again
    return this.sendEmail(emailData);
  }
}

export const emailTrackingService = new EmailTrackingService();
